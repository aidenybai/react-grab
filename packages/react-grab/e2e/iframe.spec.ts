import { expect, test } from "./fixtures.js";
import {
  IFRAME_RESIZE_TEST_VIEWPORT_HEIGHT_PX,
  IFRAME_RESIZE_TEST_VIEWPORT_WIDTH_PX,
  IFRAME_SCROLL_DELTA_Y_PX,
  IFRAME_SCROLL_SETTLE_DELAY_MS,
  IFRAME_TEST_POINTER_ID,
  NON_UNIFORM_SCALED_IFRAME_EXPECTED_BORDER_RADIUS,
  POINTER_SETTLE_DELAY_MS,
  SCALED_IFRAME_EXPECTED_BORDER_RADIUS,
  Z_INDEX_OVERLAY,
} from "./constants.js";
import { movePointerToLocatorCenter } from "./move-pointer-to-locator-center.js";

test.describe("Iframe selection", () => {
  test("does not forward iframe resizes for a top-document selection", async ({ reactGrab }) => {
    await reactGrab.page.evaluate((zIndex) => {
      const targetElement = document.createElement("button");
      targetElement.dataset.testid = "top-document-resize-target";
      targetElement.textContent = "Top document resize target";
      targetElement.style.cssText = `position:fixed;inset:0 auto auto 0;z-index:${zIndex}`;
      document.body.append(targetElement);
    }, Z_INDEX_OVERLAY);
    await reactGrab.activate();
    await reactGrab.page
      .locator("[data-testid='top-document-resize-target']")
      .hover({ force: true });
    await expect.poll(reactGrab.getTargetTestId).toBe("top-document-resize-target");

    const originalViewportSize = reactGrab.page.viewportSize();
    await reactGrab.page.evaluate(() => {
      document.documentElement.dataset.forwardedIframeResizeCount = "0";
      window.addEventListener("resize", (event) => {
        if (event.isTrusted) return;
        document.documentElement.dataset.forwardedIframeResizeCount = String(
          Number(document.documentElement.dataset.forwardedIframeResizeCount) + 1,
        );
      });
    });
    await reactGrab.page.setViewportSize({
      width: IFRAME_RESIZE_TEST_VIEWPORT_WIDTH_PX,
      height: IFRAME_RESIZE_TEST_VIEWPORT_HEIGHT_PX,
    });
    await reactGrab.page.waitForTimeout(POINTER_SETTLE_DELAY_MS);

    const forwardedResizeCount = await reactGrab.page.evaluate(() =>
      Number(document.documentElement.dataset.forwardedIframeResizeCount),
    );
    if (originalViewportSize) await reactGrab.page.setViewportSize(originalViewportSize);
    expect(forwardedResizeCount).toBe(0);
  });

  test("does not forward iframe events while React Grab is idle", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => {
      window.addEventListener("click", () => {
        document.documentElement.dataset.forwardedIdleClickCount = String(
          Number(document.documentElement.dataset.forwardedIdleClickCount ?? 0) + 1,
        );
      });
    });

    await reactGrab.page
      .frameLocator("[data-testid='same-origin-iframe']")
      .locator("[data-testid='iframe-target']")
      .click();

    await expect
      .poll(() =>
        reactGrab.page.evaluate(() =>
          Number(document.documentElement.dataset.forwardedIdleClickCount ?? 0),
        ),
      )
      .toBe(0);
  });

  test("cancels a source iframe interaction consumed by React Grab", async ({ reactGrab }) => {
    await reactGrab.activate();

    const sourceEventResult = await reactGrab.page
      .frameLocator("[data-testid='same-origin-iframe']")
      .locator("[data-testid='iframe-target']")
      .evaluate((element) => {
        let targetClickCount = 0;
        element.addEventListener("click", () => {
          targetClickCount += 1;
        });
        const sourceEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          shiftKey: true,
        });
        const didDispatch = element.dispatchEvent(sourceEvent);
        return {
          didDispatch,
          sourceDefaultPrevented: sourceEvent.defaultPrevented,
          targetClickCount,
        };
      });

    expect(sourceEventResult).toEqual({
      didDispatch: false,
      sourceDefaultPrevented: true,
      targetClickCount: 0,
    });
  });

  test("blocks hover and click side effects inside a same-origin iframe while frozen", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(() => {
      const iframeElement = document.createElement("iframe");
      iframeElement.dataset.testid = "freeze-side-effect-iframe";
      iframeElement.srcdoc = `
        <style>
          button { background: rgb(255, 255, 255); }
          button:hover { background: rgb(239, 68, 68); }
        </style>
        <button data-testid="freeze-side-effect-target" onclick="document.documentElement.dataset.clickCount = String(Number(document.documentElement.dataset.clickCount || 0) + 1)">
          Freeze side effect target
        </button>
      `;
      iframeElement.style.cssText =
        "position:fixed;left:80px;top:80px;width:240px;height:160px;z-index:2147480000";
      document.body.append(iframeElement);
    });

    const frameTarget = reactGrab.page
      .frameLocator("[data-testid='freeze-side-effect-iframe']")
      .locator("[data-testid='freeze-side-effect-target']");
    await expect(frameTarget).toBeVisible();
    await reactGrab.page.evaluate(() => window.freezeReactGrab());
    await frameTarget.hover({ force: true });
    await frameTarget.click({ force: true });

    await expect(frameTarget).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect
      .poll(() =>
        frameTarget.evaluate(() => Number(document.documentElement.dataset.clickCount ?? 0)),
      )
      .toBe(0);

    await reactGrab.page.evaluate(() => window.unfreezeReactGrab());
  });

  test("registers an iframe inserted while pseudo states are frozen", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => window.freezeReactGrab());
    await reactGrab.page.evaluate(async () => {
      const iframeElement = document.createElement("iframe");
      iframeElement.dataset.testid = "late-freeze-iframe";
      iframeElement.srcdoc = `
        <style>
          @keyframes late-frame-motion { to { transform: translateX(100px); } }
          button { animation: late-frame-motion 1s linear infinite; }
        </style>
        <button data-testid="late-freeze-target">Late freeze target</button>
      `;
      const didLoad = new Promise<void>((resolve) => {
        iframeElement.addEventListener("load", () => resolve(), { once: true });
      });
      document.body.append(iframeElement);
      await didLoad;
    });

    const frameTarget = reactGrab.page
      .frameLocator("[data-testid='late-freeze-iframe']")
      .locator("[data-testid='late-freeze-target']");
    await expect(frameTarget).toBeVisible();
    await expect
      .poll(() =>
        frameTarget.evaluate(() =>
          Boolean(document.querySelector("style[data-react-grab-frozen-pseudo]")),
        ),
      )
      .toBe(true);
    await expect
      .poll(() => frameTarget.evaluate(() => document.getAnimations()[0]?.playState))
      .toBe("paused");
    const blockedFocusResult = await frameTarget.evaluate((element) => {
      let focusCount = 0;
      element.addEventListener("focus", () => {
        focusCount += 1;
      });
      const didDispatch = element.dispatchEvent(
        new FocusEvent("focus", { bubbles: true, cancelable: true }),
      );
      return { didDispatch, focusCount };
    });
    expect(blockedFocusResult).toEqual({ didDispatch: false, focusCount: 0 });

    await reactGrab.page.evaluate(() => window.unfreezeReactGrab());
    await expect
      .poll(() =>
        frameTarget.evaluate(() =>
          Boolean(document.querySelector("style[data-react-grab-frozen-pseudo]")),
        ),
      )
      .toBe(false);
    await expect
      .poll(() => frameTarget.evaluate(() => document.getAnimations()[0]?.playState))
      .toBe("running");
    const restoredFocusResult = await frameTarget.evaluate((element) => {
      let focusCount = 0;
      element.addEventListener("focus", () => {
        focusCount += 1;
      });
      const didDispatch = element.dispatchEvent(
        new FocusEvent("focus", { bubbles: true, cancelable: true }),
      );
      return { didDispatch, focusCount };
    });
    expect(restoredFocusResult).toEqual({ didDispatch: true, focusCount: 1 });
  });

  test("freezes animations inside a same-origin iframe", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => {
      const iframeElement = document.createElement("iframe");
      iframeElement.dataset.testid = "animated-iframe";
      iframeElement.srcdoc = `
        <style>
          @keyframes iframe-motion { to { transform: translateX(100px); } }
          button { animation: iframe-motion 1s linear infinite; }
        </style>
        <button data-testid="animated-iframe-target">Animated target</button>
      `;
      document.body.append(iframeElement);
    });

    const frameTarget = reactGrab.page
      .frameLocator("[data-testid='animated-iframe']")
      .locator("[data-testid='animated-iframe-target']");
    await expect(frameTarget).toBeVisible();
    await expect
      .poll(() => frameTarget.evaluate(() => document.getAnimations()[0]?.playState))
      .toBe("running");

    await reactGrab.page.evaluate(() => window.freezeReactGrab());
    await expect
      .poll(() => frameTarget.evaluate(() => document.getAnimations()[0]?.playState))
      .toBe("paused");

    await reactGrab.page.evaluate(() => window.unfreezeReactGrab());
    await expect
      .poll(() => frameTarget.evaluate(() => document.getAnimations()[0]?.playState))
      .toBe("running");
  });

  test("activates from the keyboard while focus is inside an iframe", async ({ reactGrab }) => {
    await reactGrab.page
      .frameLocator("[data-testid='same-origin-iframe']")
      .locator("[data-testid='iframe-target']")
      .focus();

    await reactGrab.activateViaKeyboard();

    expect((await reactGrab.getState()).isActive).toBe(true);
  });

  test("removes forwarded listeners when an iframe is detached", async ({ reactGrab }) => {
    await reactGrab.activate();

    const forwardedClickCount = await reactGrab.page.evaluate(async () => {
      let clickCount = 0;
      window.addEventListener("click", () => {
        clickCount += 1;
      });

      const iframeElement = document.createElement("iframe");
      iframeElement.srcdoc = '<button data-testid="detached-frame-target">Target</button>';
      const didLoad = new Promise<void>((resolve) => {
        iframeElement.addEventListener("load", () => resolve(), { once: true });
      });
      document.body.append(iframeElement);
      await didLoad;

      const frameButton = iframeElement.contentDocument?.querySelector("button");
      iframeElement.remove();
      await Promise.resolve();
      frameButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      return clickCount;
    });

    expect(forwardedClickCount).toBe(0);
  });

  test("disconnects shadow root observers when an iframe is detached", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(async () => {
      document.documentElement.dataset.detachedFrameObserverDisconnectCount = "0";
      const iframeElement = document.createElement("iframe");
      iframeElement.srcdoc = '<div data-testid="detached-shadow-host"></div>';
      const didLoad = new Promise<void>((resolve) => {
        iframeElement.addEventListener("load", () => resolve(), { once: true });
      });
      document.body.append(iframeElement);
      await didLoad;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const frameWindow = iframeElement.contentWindow;
      const hostElement = iframeElement.contentDocument?.querySelector(
        "[data-testid='detached-shadow-host']",
      );
      if (!frameWindow || !hostElement) return;

      const mutationObserverPrototype = Reflect.get(frameWindow, "MutationObserver").prototype;
      const originalDisconnect = mutationObserverPrototype.disconnect;
      mutationObserverPrototype.disconnect = new Proxy(originalDisconnect, {
        apply: (disconnect, mutationObserver, argumentList) => {
          document.documentElement.dataset.detachedFrameObserverDisconnectCount = String(
            Number(document.documentElement.dataset.detachedFrameObserverDisconnectCount) + 1,
          );
          return Reflect.apply(disconnect, mutationObserver, argumentList);
        },
      });

      hostElement.attachShadow({ mode: "open" }).append(document.createElement("button"));
      iframeElement.remove();
    });

    await expect
      .poll(() =>
        reactGrab.page.evaluate(() =>
          Number(document.documentElement.dataset.detachedFrameObserverDisconnectCount),
        ),
      )
      .toBe(2);
  });

  test("discovers an iframe in a shadow root attached after its host connects", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(async () => {
      const hostElement = document.createElement("div");
      hostElement.dataset.testid = "shadow-iframe-host";
      document.body.append(hostElement);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const iframeElement = document.createElement("iframe");
      iframeElement.dataset.testid = "shadow-nested-iframe";
      iframeElement.srcdoc =
        '<button data-testid="shadow-iframe-target" style="margin: 20px; padding: 20px">Shadow iframe target</button>';
      hostElement.attachShadow({ mode: "open" }).append(iframeElement);
    });

    const frameTarget = reactGrab.page
      .frameLocator("[data-testid='shadow-nested-iframe']")
      .locator("[data-testid='shadow-iframe-target']");
    await expect(frameTarget).toBeVisible();
    await reactGrab.activate();
    await movePointerToLocatorCenter(reactGrab.page, frameTarget);

    await expect.poll(reactGrab.getTargetTestId).toBe("shadow-iframe-target");
  });

  test("discovers an iframe inserted into a registered iframe document", async ({ reactGrab }) => {
    await reactGrab.page
      .frameLocator("[data-testid='same-origin-iframe']")
      .locator("body")
      .evaluate(async (frameBody) => {
        const nestedIframeElement = document.createElement("iframe");
        nestedIframeElement.dataset.testid = "dynamically-nested-iframe";
        nestedIframeElement.srcdoc =
          '<button data-testid="dynamically-nested-iframe-target">Nested iframe target</button>';
        const didLoad = new Promise<void>((resolve) => {
          nestedIframeElement.addEventListener("load", () => resolve(), { once: true });
        });
        frameBody.append(nestedIframeElement);
        await didLoad;
      });

    const nestedIframeTarget = reactGrab.page
      .frameLocator("[data-testid='same-origin-iframe']")
      .frameLocator("[data-testid='dynamically-nested-iframe']")
      .locator("[data-testid='dynamically-nested-iframe-target']");
    await expect(nestedIframeTarget).toBeVisible();
    await reactGrab.activate();
    await movePointerToLocatorCenter(reactGrab.page, nestedIframeTarget);

    await expect.poll(reactGrab.getTargetTestId).toBe("dynamically-nested-iframe-target");
  });

  test("re-registers an iframe after its document is replaced", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(async () => {
      const iframeElement = document.createElement("iframe");
      iframeElement.dataset.testid = "navigating-iframe";
      iframeElement.srcdoc = '<button data-testid="before-navigation">Before navigation</button>';
      const didLoad = new Promise<void>((resolve) => {
        iframeElement.addEventListener("load", () => resolve(), { once: true });
      });
      document.body.append(iframeElement);
      await didLoad;
    });

    await reactGrab.activate();
    const initialTarget = reactGrab.page
      .frameLocator("[data-testid='navigating-iframe']")
      .locator("[data-testid='before-navigation']");
    await movePointerToLocatorCenter(reactGrab.page, initialTarget);
    await expect.poll(reactGrab.getTargetTestId).toBe("before-navigation");

    await reactGrab.page.locator("[data-testid='navigating-iframe']").evaluate((element) => {
      if (!(element instanceof HTMLIFrameElement)) return;
      element.srcdoc = '<button data-testid="after-navigation">After navigation</button>';
    });
    const replacementTarget = reactGrab.page
      .frameLocator("[data-testid='navigating-iframe']")
      .locator("[data-testid='after-navigation']");
    await expect(replacementTarget).toBeVisible();
    await movePointerToLocatorCenter(reactGrab.page, replacementTarget);

    await expect.poll(reactGrab.getTargetTestId).toBe("after-navigation");
  });

  test("restores the shadow root hook when React Grab is disposed", async ({ reactGrab }) => {
    const didRestoreAttachShadow = await reactGrab.page.evaluate(() => {
      const patchedAttachShadow = Element.prototype.attachShadow;
      window.__REACT_GRAB__?.dispose();
      return Element.prototype.attachShadow !== patchedAttachShadow;
    });

    expect(didRestoreAttachShadow).toBe(true);
  });

  test("does not descend into an iframe covered by an opaque ignored element", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(() => {
      const iframeElement = document.createElement("iframe");
      iframeElement.dataset.testid = "covered-iframe";
      iframeElement.srcdoc =
        '<button data-testid="covered-iframe-target" style="margin: 40px; padding: 20px">Hidden target</button>';
      iframeElement.style.cssText =
        "position:fixed;left:80px;top:80px;width:240px;height:160px;border:0;z-index:2147480000";
      const coverElement = document.createElement("div");
      coverElement.dataset.testid = "opaque-iframe-cover";
      coverElement.setAttribute("data-react-grab-ignore", "");
      coverElement.style.cssText =
        "position:fixed;left:80px;top:80px;width:240px;height:160px;background:#111827;z-index:2147480001;pointer-events:auto";
      document.body.append(iframeElement, coverElement);

      window.__REACT_GRAB__?.registerPlugin({
        name: "covered-iframe-drag",
        hooks: {
          onDragEnd: (elements) => {
            document.documentElement.dataset.coveredIframeDragTargets = elements
              .map((element) => element.getAttribute("data-testid") ?? element.tagName)
              .join(",");
          },
        },
      });
    });

    const hiddenTarget = reactGrab.page
      .frameLocator("[data-testid='covered-iframe']")
      .locator("[data-testid='covered-iframe-target']");
    await expect(hiddenTarget).toBeVisible();
    await reactGrab.activate();
    await movePointerToLocatorCenter(reactGrab.page, hiddenTarget);

    await expect.poll(reactGrab.getTargetTestId).not.toBe("covered-iframe-target");

    await reactGrab.page.mouse.move(81, 81);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(319, 239, { steps: 10 });
    await reactGrab.page.mouse.up();

    await expect
      .poll(() =>
        reactGrab.page.evaluate(
          () => document.documentElement.dataset.coveredIframeDragTargets?.split(",") ?? [],
        ),
      )
      .not.toContain("covered-iframe-target");
  });

  test("drag-selects elements across the top document and an iframe in document order", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(() => {
      const topDocumentTarget = document.createElement("button");
      topDocumentTarget.dataset.testid = "top-drag-target";
      topDocumentTarget.textContent = "Top document target";
      topDocumentTarget.style.cssText =
        "position:fixed;left:40px;top:100px;width:100px;height:100px;z-index:2147480000";

      const iframeElement = document.createElement("iframe");
      iframeElement.dataset.testid = "iframe-drag-frame";
      iframeElement.srcdoc =
        '<button data-testid="iframe-drag-target" style="width:100px;height:100px;margin:0">Iframe target</button>';
      iframeElement.style.cssText =
        "position:fixed;left:180px;top:100px;width:100px;height:100px;border:0;z-index:2147480000";
      document.body.append(topDocumentTarget, iframeElement);

      window.__REACT_GRAB__?.registerPlugin({
        name: "iframe-drag-order",
        hooks: {
          onDragEnd: (elements) => {
            document.documentElement.dataset.iframeDragOrder = elements
              .map((element) => element.getAttribute("data-testid") ?? element.tagName)
              .join(",");
          },
        },
      });
    });

    await expect(
      reactGrab.page
        .frameLocator("[data-testid='iframe-drag-frame']")
        .locator("[data-testid='iframe-drag-target']"),
    ).toBeVisible();
    await reactGrab.activate();
    await reactGrab.page.mouse.move(41, 101);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(279, 199, { steps: 10 });
    await reactGrab.page.mouse.up();

    await expect
      .poll(() =>
        reactGrab.page.evaluate(
          () => document.documentElement.dataset.iframeDragOrder?.split(",") ?? [],
        ),
      )
      .toEqual(["top-drag-target", "iframe-drag-target"]);
  });

  test("drag-selects nested roots beneath a transparent overlay", async ({ reactGrab }) => {
    await reactGrab.page.evaluate((zIndex) => {
      const shadowHostElement = document.createElement("div");
      shadowHostElement.dataset.testid = "overlay-shadow-drag-host";
      shadowHostElement.style.cssText = `position:fixed;left:40px;top:100px;width:100px;height:100px;z-index:${zIndex}`;
      const shadowTargetElement = document.createElement("button");
      shadowTargetElement.dataset.testid = "overlay-shadow-drag-target";
      shadowTargetElement.style.cssText =
        "display:block;box-sizing:border-box;width:100%;height:100%";
      shadowHostElement.attachShadow({ mode: "open" }).append(shadowTargetElement);

      const iframeElement = document.createElement("iframe");
      iframeElement.dataset.testid = "overlay-iframe-drag-frame";
      iframeElement.srcdoc =
        '<button data-testid="overlay-iframe-drag-target" style="width:100px;height:100px;margin:0">Iframe target</button>';
      iframeElement.style.cssText = `position:fixed;left:180px;top:100px;width:100px;height:100px;border:0;z-index:${zIndex}`;

      const overlayElement = document.createElement("div");
      overlayElement.dataset.testid = "transparent-drag-overlay";
      overlayElement.style.cssText = `position:fixed;inset:0;background:transparent;z-index:${zIndex}`;
      document.body.append(shadowHostElement, iframeElement, overlayElement);

      window.__REACT_GRAB__?.registerPlugin({
        name: "overlay-nested-drag-order",
        hooks: {
          onDragEnd: (elements) => {
            document.documentElement.dataset.overlayNestedDragOrder = elements
              .map((element) => element.getAttribute("data-testid") ?? element.tagName)
              .join(",");
          },
        },
      });
    }, Z_INDEX_OVERLAY);

    await expect(
      reactGrab.page
        .frameLocator("[data-testid='overlay-iframe-drag-frame']")
        .locator("[data-testid='overlay-iframe-drag-target']"),
    ).toBeVisible();
    await reactGrab.activate();
    await reactGrab.page.mouse.move(41, 101);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(279, 199, { steps: 10 });
    await reactGrab.page.mouse.up();

    await expect
      .poll(() =>
        reactGrab.page.evaluate(
          () => document.documentElement.dataset.overlayNestedDragOrder?.split(",") ?? [],
        ),
      )
      .toEqual(["overlay-shadow-drag-target", "overlay-iframe-drag-target"]);
  });

  test("normalizes coordinates for an unscaled iframe with a fractional width", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(() => {
      const iframeElement = document.createElement("iframe");
      iframeElement.dataset.testid = "fractional-width-iframe";
      iframeElement.srcdoc = `
        <style>* { box-sizing: border-box } body { margin: 0; position: relative; width: 200.5px; height: 40px }</style>
        <button data-testid="fractional-edge-target" style="position:absolute;left:199.6px;top:0;width:0.2px;height:40px;padding:0;border:0"></button>
      `;
      iframeElement.style.cssText =
        "position:fixed;left:40px;top:240px;width:200.5px;height:40px;border:0;z-index:2147480000";
      document.body.append(iframeElement);

      window.__REACT_GRAB__?.registerPlugin({
        name: "fractional-iframe-bounds",
        hooks: {
          onSelectionBox: (isVisible, bounds, element) => {
            if (
              !isVisible ||
              !bounds ||
              element?.getAttribute("data-testid") !== "fractional-edge-target"
            )
              return;
            document.documentElement.dataset.fractionalSelectionX = String(bounds.x);
            document.documentElement.dataset.fractionalSelectionWidth = String(bounds.width);
          },
        },
      });
    });

    const edgeTarget = reactGrab.page
      .frameLocator("[data-testid='fractional-width-iframe']")
      .locator("[data-testid='fractional-edge-target']");
    await expect(edgeTarget).toBeVisible();
    await reactGrab.activate();
    await movePointerToLocatorCenter(reactGrab.page, edgeTarget);

    await expect.poll(reactGrab.getTargetTestId).toBe("fractional-edge-target");

    const targetBounds = await edgeTarget.boundingBox();
    expect(targetBounds).not.toBeNull();
    if (!targetBounds) return;
    const selectionBounds = await reactGrab.page.evaluate(() => ({
      x: Number(document.documentElement.dataset.fractionalSelectionX),
      width: Number(document.documentElement.dataset.fractionalSelectionWidth),
    }));
    expect(selectionBounds.x).toBeCloseTo(targetBounds.x, 1);
    expect(selectionBounds.width).toBeCloseTo(targetBounds.width, 1);
  });

  test("reuses the parent React Grab instance in a same-origin iframe", async ({ reactGrab }) => {
    await expect
      .poll(() =>
        reactGrab.page.evaluate(() => {
          const iframe = document.querySelector<HTMLIFrameElement>(
            "[data-testid='iframe-pierre-diff']",
          );
          return iframe?.contentWindow?.__REACT_GRAB__ === window.__REACT_GRAB__;
        }),
      )
      .toBe(true);
  });

  test("selects an element inside a same-origin iframe", async ({ reactGrab }) => {
    await reactGrab.activate();
    const frameTarget = reactGrab.page
      .frameLocator("[data-testid='same-origin-iframe']")
      .locator("[data-testid='iframe-target']");
    await movePointerToLocatorCenter(reactGrab.page, frameTarget);

    await expect
      .poll(() =>
        reactGrab.page.evaluate(() => {
          const targetElement = window.__REACT_GRAB__?.getState().targetElement;
          return {
            testId: targetElement?.getAttribute("data-testid") ?? null,
            isFromChildDocument: targetElement?.ownerDocument !== document,
          };
        }),
      )
      .toEqual({ testId: "iframe-target", isFromChildDocument: true });
  });

  test("copies a plain iframe element without using the parent frame fiber", async ({
    reactGrab,
  }) => {
    const didCopy = await reactGrab.page.evaluate(async () => {
      const iframeElement = document.querySelector<HTMLIFrameElement>(
        "[data-testid='same-origin-iframe']",
      );
      const targetElement = iframeElement?.contentDocument?.querySelector(
        "[data-testid='iframe-target']",
      );
      if (!targetElement) return false;
      return (await window.__REACT_GRAB__?.copyElement(targetElement)) ?? false;
    });

    expect(didCopy).toBe(true);
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("Start a workspace");
    expect(clipboardContent).not.toContain("IframeFixture");
  });

  test("descends into an iframe beneath a transparent viewport overlay", async ({ reactGrab }) => {
    const iframeTarget = reactGrab.page
      .frameLocator("[data-testid='same-origin-iframe']")
      .locator("[data-testid='iframe-target']");
    await iframeTarget.scrollIntoViewIfNeeded();
    await reactGrab.page.evaluate((zIndex) => {
      const overlayElement = document.createElement("div");
      overlayElement.dataset.testid = "transparent-iframe-overlay";
      overlayElement.style.cssText = `position:fixed;inset:0;background:transparent;z-index:${zIndex}`;
      document.body.append(overlayElement);
    }, Z_INDEX_OVERLAY);

    await reactGrab.activate();
    await movePointerToLocatorCenter(reactGrab.page, iframeTarget);

    await expect.poll(reactGrab.getTargetTestId).toBe("iframe-target");
  });

  test("descends into a transparent viewport iframe beneath a non-grabbable layer", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate((zIndex) => {
      const iframeElement = document.createElement("iframe");
      iframeElement.dataset.testid = "transparent-viewport-iframe";
      iframeElement.srcdoc =
        '<button data-testid="transparent-viewport-iframe-target" style="position:fixed;left:100px;top:100px;width:120px;height:48px">Iframe target</button>';
      iframeElement.style.cssText = `position:fixed;inset:0;width:100vw;height:100vh;border:0;background:transparent;z-index:${zIndex}`;

      const overlayElement = document.createElement("div");
      overlayElement.dataset.testid = "transparent-viewport-cover";
      overlayElement.style.cssText = `position:fixed;inset:0;background:transparent;z-index:${zIndex + 1}`;
      document.body.append(iframeElement, overlayElement);
    }, Z_INDEX_OVERLAY);

    const iframeTarget = reactGrab.page
      .frameLocator("[data-testid='transparent-viewport-iframe']")
      .locator("[data-testid='transparent-viewport-iframe-target']");
    await iframeTarget.waitFor();
    await reactGrab.activate();
    await reactGrab.page.mouse.move(160, 124);

    await expect.poll(reactGrab.getTargetTestId).toBe("transparent-viewport-iframe-target");
  });

  test("selects through an iframe and nested shadow root", async ({ reactGrab }) => {
    await reactGrab.activate();
    const shadowTarget = reactGrab.page
      .frameLocator("[data-testid='same-origin-iframe']")
      .locator("[data-testid='iframe-shadow-target']");
    await movePointerToLocatorCenter(reactGrab.page, shadowTarget);

    await expect
      .poll(() =>
        reactGrab.page.evaluate(() => {
          const targetElement = window.__REACT_GRAB__?.getState().targetElement;
          const rootNode = targetElement?.getRootNode();
          return {
            testId: targetElement?.getAttribute("data-testid") ?? null,
            isFromChildDocument: targetElement?.ownerDocument !== document,
            isInsideShadowRoot: rootNode?.nodeType === Node.DOCUMENT_FRAGMENT_NODE,
          };
        }),
      )
      .toEqual({
        testId: "iframe-shadow-target",
        isFromChildDocument: true,
        isInsideShadowRoot: true,
      });
  });

  test("selects a Pierre diff element inside a same-origin iframe", async ({ reactGrab }) => {
    await reactGrab.activate();
    const diffCodeElement = reactGrab.page
      .frameLocator("[data-testid='iframe-pierre-diff']")
      .locator("diffs-container code")
      .first();
    await movePointerToLocatorCenter(reactGrab.page, diffCodeElement);

    await expect
      .poll(() =>
        reactGrab.page.evaluate(() => {
          const targetElement = window.__REACT_GRAB__?.getState().targetElement;
          return {
            isFromChildDocument: targetElement?.ownerDocument !== document,
            isInsideShadowRoot:
              targetElement?.getRootNode().nodeType === Node.DOCUMENT_FRAGMENT_NODE,
          };
        }),
      )
      .toEqual({
        isFromChildDocument: true,
        isInsideShadowRoot: true,
      });
  });

  test("scrolls a same-origin iframe while selection is active", async ({ reactGrab }) => {
    const iframe = reactGrab.page.locator("[data-testid='same-origin-iframe']");
    await iframe.scrollIntoViewIfNeeded();
    const iframeBounds = await iframe.boundingBox();
    expect(iframeBounds).not.toBeNull();
    if (!iframeBounds) return;

    await reactGrab.activate();
    await reactGrab.page.mouse.move(
      iframeBounds.x + iframeBounds.width / 2,
      iframeBounds.y + iframeBounds.height / 2,
    );
    await reactGrab.page.waitForTimeout(IFRAME_SCROLL_SETTLE_DELAY_MS);
    await reactGrab.page.mouse.wheel(0, IFRAME_SCROLL_DELTA_Y_PX);

    await expect
      .poll(() =>
        reactGrab.page
          .frameLocator("[data-testid='same-origin-iframe']")
          .locator("html")
          .evaluate((element) => element.scrollTop),
      )
      .toBeGreaterThan(0);
  });

  test("normalizes coordinates for a scaled iframe", async ({ reactGrab }) => {
    await reactGrab.activate();
    const scaledTarget = reactGrab.page
      .frameLocator("[data-testid='scaled-same-origin-iframe']")
      .locator("[data-testid='iframe-target']");
    await movePointerToLocatorCenter(reactGrab.page, scaledTarget);

    await expect.poll(reactGrab.getTargetTestId).toBe("iframe-target");
  });

  test("scales selection corner radius with a transformed iframe", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => {
      window.__REACT_GRAB__?.registerPlugin({
        name: "scaled-iframe-border-radius",
        hooks: {
          onSelectionBox: (isVisible, bounds, element) => {
            if (!isVisible || !bounds || element?.getAttribute("data-testid") !== "iframe-target")
              return;
            if (element.ownerDocument === document) return;
            document.documentElement.dataset.scaledIframeBorderRadius = bounds.borderRadius;
          },
        },
      });
    });

    await reactGrab.activate();
    await movePointerToLocatorCenter(
      reactGrab.page,
      reactGrab.page
        .frameLocator("[data-testid='scaled-same-origin-iframe']")
        .locator("[data-testid='iframe-target']"),
    );

    await expect
      .poll(() =>
        reactGrab.page.evaluate(
          () => document.documentElement.dataset.scaledIframeBorderRadius ?? "",
        ),
      )
      .toBe(SCALED_IFRAME_EXPECTED_BORDER_RADIUS);
  });

  test("scales elliptical corner radii with a non-uniform iframe transform", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(() => {
      const iframeElement = document.querySelector<HTMLIFrameElement>(
        "[data-testid='scaled-same-origin-iframe']",
      );
      if (!iframeElement) return;
      iframeElement.style.scale = "1";
      iframeElement.style.transform = "scale(0.75, 0.5)";

      window.__REACT_GRAB__?.registerPlugin({
        name: "non-uniform-scaled-iframe-border-radius",
        hooks: {
          onSelectionBox: (isVisible, bounds, element) => {
            if (!isVisible || !bounds || element?.getAttribute("data-testid") !== "iframe-target")
              return;
            if (element.ownerDocument === document) return;
            document.documentElement.dataset.nonUniformScaledIframeBorderRadius =
              bounds.borderRadius;
          },
        },
      });
    });

    await reactGrab.activate();
    await movePointerToLocatorCenter(
      reactGrab.page,
      reactGrab.page
        .frameLocator("[data-testid='scaled-same-origin-iframe']")
        .locator("[data-testid='iframe-target']"),
    );

    await expect
      .poll(() =>
        reactGrab.page.evaluate(
          () => document.documentElement.dataset.nonUniformScaledIframeBorderRadius ?? "",
        ),
      )
      .toBe(NON_UNIFORM_SCALED_IFRAME_EXPECTED_BORDER_RADIUS);
  });

  test("falls back to an inaccessible sandboxed iframe", async ({ reactGrab }) => {
    const sandboxedIframe = reactGrab.page.locator("[data-testid='sandboxed-iframe']");
    await sandboxedIframe.scrollIntoViewIfNeeded();
    const iframeBounds = await sandboxedIframe.boundingBox();
    expect(iframeBounds).not.toBeNull();
    if (!iframeBounds) return;

    await reactGrab.activate();
    await reactGrab.page.waitForTimeout(POINTER_SETTLE_DELAY_MS);
    await reactGrab.page.evaluate(
      ({ clientX, clientY, pointerId }) => {
        window.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
            isPrimary: true,
            pointerId,
            pointerType: "mouse",
          }),
        );
      },
      {
        clientX: iframeBounds.x + iframeBounds.width / 2,
        clientY: iframeBounds.y + iframeBounds.height / 2,
        pointerId: IFRAME_TEST_POINTER_ID,
      },
    );

    await expect.poll(reactGrab.getTargetTestId).toBe("sandboxed-iframe");
  });

  test("refreshes an inaccessible iframe hit when its stacking changes", async ({ reactGrab }) => {
    const sandboxedIframe = reactGrab.page.locator("[data-testid='sandboxed-iframe']");
    await sandboxedIframe.scrollIntoViewIfNeeded();
    const iframeBounds = await sandboxedIframe.boundingBox();
    expect(iframeBounds).not.toBeNull();
    if (!iframeBounds) return;

    const clientX = iframeBounds.x + iframeBounds.width / 2;
    const clientY = iframeBounds.y + iframeBounds.height / 2;
    const dispatchPointerMove = async (): Promise<void> => {
      await reactGrab.page.evaluate(
        ({ pointerClientX, pointerClientY, pointerId }) => {
          window.dispatchEvent(
            new PointerEvent("pointermove", {
              bubbles: true,
              cancelable: true,
              clientX: pointerClientX,
              clientY: pointerClientY,
              isPrimary: true,
              pointerId,
              pointerType: "mouse",
            }),
          );
        },
        {
          pointerClientX: clientX,
          pointerClientY: clientY,
          pointerId: IFRAME_TEST_POINTER_ID,
        },
      );
    };
    await reactGrab.activate();
    await reactGrab.page.waitForTimeout(POINTER_SETTLE_DELAY_MS * 2);
    await dispatchPointerMove();
    await expect.poll(reactGrab.getTargetTestId).toBe("sandboxed-iframe");

    await reactGrab.page.evaluate(
      ({ x, y, width, height, zIndex }) => {
        const coveringElement = document.createElement("button");
        coveringElement.dataset.testid = "sandboxed-iframe-cover";
        coveringElement.textContent = "Cover";
        coveringElement.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${width}px;height:${height}px;z-index:${zIndex}`;
        document.body.append(coveringElement);
      },
      { ...iframeBounds, zIndex: Z_INDEX_OVERLAY },
    );
    await reactGrab.page.waitForTimeout(POINTER_SETTLE_DELAY_MS * 2);
    await dispatchPointerMove();

    await expect.poll(reactGrab.getTargetTestId).toBe("sandboxed-iframe-cover");
  });
});
