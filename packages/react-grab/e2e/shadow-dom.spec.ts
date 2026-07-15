import { expect, test } from "./fixtures.js";
import { movePointerToLocatorCenter } from "./move-pointer-to-locator-center.js";
import { SHADOW_FRAME_FOCUS_OUTLINE_COLOR, SHADOW_HOVER_BACKGROUND_COLOR } from "./constants.js";

declare global {
  interface Window {
    freezeReactGrab: () => void;
    unfreezeReactGrab: () => void;
  }
}

test.describe("Shadow DOM", () => {
  test("preserves shadow hover styles during a coordinate-free freeze", async ({ reactGrab }) => {
    await reactGrab.page.evaluate((hoverBackgroundColor) => {
      const hostElement = document.createElement("div");
      hostElement.style.cssText = "position:fixed;left:400px;top:300px;z-index:2147480000";
      hostElement.attachShadow({ mode: "open" }).innerHTML = `
        <style>
          button { background: white; }
          button:hover { background: ${hoverBackgroundColor}; }
        </style>
        <button data-testid="shadow-freeze-hover-target">Shadow hover target</button>
      `;
      document.body.append(hostElement);
    }, SHADOW_HOVER_BACKGROUND_COLOR);

    const hoverTarget = reactGrab.page.locator("[data-testid='shadow-freeze-hover-target']");
    await hoverTarget.hover();
    await expect(hoverTarget).toHaveCSS("background-color", SHADOW_HOVER_BACKGROUND_COLOR);

    await reactGrab.page.evaluate(() => window.freezeReactGrab());
    await expect(hoverTarget).toHaveCSS("background-color", SHADOW_HOVER_BACKGROUND_COLOR);
    await reactGrab.page.evaluate(() => window.unfreezeReactGrab());
  });

  test("preserves focus through a shadow root and iframe", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(async (focusOutlineColor) => {
      const hostElement = document.createElement("div");
      const iframeElement = document.createElement("iframe");
      iframeElement.dataset.testid = "shadow-focus-iframe";
      iframeElement.srcdoc = `
        <style>button:focus { outline-color: ${focusOutlineColor}; }</style>
        <button data-testid="shadow-frame-focus-target">Focus target</button>
      `;
      const didLoad = new Promise<void>((resolve) => {
        iframeElement.addEventListener("load", () => resolve(), { once: true });
      });
      hostElement.attachShadow({ mode: "open" }).append(iframeElement);
      document.body.append(hostElement);
      await didLoad;
      iframeElement.contentDocument
        ?.querySelector<HTMLElement>("[data-testid='shadow-frame-focus-target']")
        ?.focus();
    }, SHADOW_FRAME_FOCUS_OUTLINE_COLOR);

    const focusTarget = reactGrab.page
      .frameLocator("[data-testid='shadow-focus-iframe']")
      .locator("[data-testid='shadow-frame-focus-target']");
    await expect(focusTarget).toBeFocused();
    await expect(focusTarget).toHaveCSS("outline-color", SHADOW_FRAME_FOCUS_OUTLINE_COLOR);

    await reactGrab.page.evaluate(() => window.freezeReactGrab());
    await expect(focusTarget).toHaveCSS("outline-color", SHADOW_FRAME_FOCUS_OUTLINE_COLOR);
    await expect
      .poll(() => focusTarget.evaluate((element) => element.style.getPropertyPriority("outline")))
      .toBe("important");

    await reactGrab.page.evaluate(() => window.unfreezeReactGrab());
    await expect
      .poll(() => focusTarget.evaluate((element) => element.style.getPropertyValue("outline")))
      .toBe("");
  });

  test("honors ignore attributes on the light parent of a slotted element", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(() => {
      const hostElement = document.createElement("div");
      hostElement.dataset.testid = "ignored-slot-host";
      hostElement.attachShadow({ mode: "open" }).innerHTML = "<slot></slot>";
      const ignoredWrapperElement = document.createElement("div");
      ignoredWrapperElement.setAttribute("data-react-grab-ignore", "");
      const buttonElement = document.createElement("button");
      buttonElement.dataset.testid = "ignored-slotted-target";
      buttonElement.textContent = "Ignored slotted target";
      ignoredWrapperElement.append(buttonElement);
      hostElement.append(ignoredWrapperElement);
      document.body.append(hostElement);
    });

    await reactGrab.activate();
    await movePointerToLocatorCenter(
      reactGrab.page,
      reactGrab.page.locator("[data-testid='ignored-slotted-target']"),
    );

    await expect.poll(reactGrab.getTargetTestId).not.toBe("ignored-slotted-target");
  });

  test("selects the innermost Pierre diff element", async ({ reactGrab }) => {
    const codeElement = reactGrab.page.locator("diffs-container code").first();
    await codeElement.scrollIntoViewIfNeeded();
    const codeBounds = await codeElement.boundingBox();
    expect(codeBounds).not.toBeNull();
    if (!codeBounds) return;

    const clientX = codeBounds.x + codeBounds.width / 2;
    const clientY = codeBounds.y + codeBounds.height / 2;

    const shadowTargetTagName = await reactGrab.page.evaluate(
      ({ clientX, clientY }) => {
        const host = document.querySelector("diffs-container");
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return null;
        const shadowTarget = shadowRoot.elementFromPoint(clientX, clientY);
        return shadowTarget?.getRootNode() === shadowRoot ? shadowTarget.tagName : null;
      },
      { clientX, clientY },
    );

    expect(shadowTargetTagName).not.toBeNull();
    if (!shadowTargetTagName) return;

    await reactGrab.activate();
    await movePointerToLocatorCenter(reactGrab.page, codeElement);

    await expect
      .poll(() =>
        reactGrab.page.evaluate(() => {
          const targetElement = window.__REACT_GRAB__?.getState().targetElement;
          return {
            tagName: targetElement?.tagName ?? null,
            isInsideShadowRoot: targetElement?.getRootNode() instanceof ShadowRoot,
          };
        }),
      )
      .toEqual({
        tagName: shadowTargetTagName,
        isInsideShadowRoot: true,
      });
  });

  test("descends through a slotted element with its own shadow root", async ({ reactGrab }) => {
    await reactGrab.activate();
    const shadowTarget = reactGrab.page.locator("[data-testid='slotted-shadow-target']");
    await movePointerToLocatorCenter(reactGrab.page, shadowTarget);

    await expect
      .poll(() =>
        reactGrab.page.evaluate(() => {
          const targetElement = window.__REACT_GRAB__?.getState().targetElement;
          const targetRoot = targetElement?.getRootNode();
          const nestedHost = targetRoot instanceof ShadowRoot ? targetRoot.host : null;
          const outerRoot = nestedHost?.assignedSlot?.getRootNode();
          return {
            testId: targetElement?.getAttribute("data-testid") ?? null,
            isInsideNestedShadowRoot: targetRoot instanceof ShadowRoot,
            isNestedHostSlottedIntoShadowRoot: outerRoot instanceof ShadowRoot,
          };
        }),
      )
      .toEqual({
        testId: "slotted-shadow-target",
        isInsideNestedShadowRoot: true,
        isNestedHostSlottedIntoShadowRoot: true,
      });
  });

  test("resolves non-fibered slotted content through its light DOM owner", async ({
    reactGrab,
  }) => {
    const source = await reactGrab.page.evaluate(async () => {
      const targetElement = document.querySelector("[data-testid='fiber-slotted-light-target']");
      if (!targetElement) return null;
      return window.__REACT_GRAB__?.getSource(targetElement);
    });

    expect(source?.componentName).toBe("SlottedLightDomOwner");
  });

  test("falls back to a closed shadow host", async ({ reactGrab }) => {
    await reactGrab.activate();
    const closedShadowHost = reactGrab.page.locator("[data-testid='closed-shadow-host']");

    await expect
      .poll(async () => {
        await reactGrab.page.mouse.move(0, 0);
        await movePointerToLocatorCenter(reactGrab.page, closedShadowHost);
        return reactGrab.getTargetTestId();
      })
      .toBe("closed-shadow-host");
  });
});
