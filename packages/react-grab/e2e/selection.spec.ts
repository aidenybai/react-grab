import { test, expect } from "./fixtures.js";
import { ATTRIBUTE_NAME } from "./constants.js";

test.describe("Element Selection", () => {
  test("should show selection box when hovering over element while active", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("li");

    const hasSelectionContent = await reactGrab.page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      return root !== null && root.innerHTML.length > 0;
    }, ATTRIBUTE_NAME);

    expect(hasSelectionContent).toBe(true);
  });

  test("should copy element content to clipboard on click", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("li");

    await reactGrab.clickElement("li");
    await expect.poll(() => reactGrab.getClipboardContent()).toBeTruthy();

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent.length).toBeGreaterThan(0);
  });

  test("should copy heading element to clipboard", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-testid='todo-list'] h1");

    await reactGrab.clickElement("[data-testid='todo-list'] h1");
    await expect.poll(() => reactGrab.getClipboardContent()).toContain("Todo List");
  });

  test("should grab direct text nodes inside mixed-content elements", async ({ reactGrab }) => {
    const target = await reactGrab.page.evaluate(() => {
      const container = document.createElement("div");
      container.id = "mixed-text-target";
      container.style.cssText =
        "position:fixed;left:40px;top:40px;padding:12px;background:white;color:black;font:16px sans-serif;z-index:2147483000";
      container.append("Grab this text ");

      const nestedElement = document.createElement("strong");
      nestedElement.textContent = "not the nested element";
      container.append(nestedElement);
      document.body.append(container);

      const textNode = container.firstChild;
      if (!(textNode instanceof Text)) throw new Error("Missing text node");

      const range = document.createRange();
      range.selectNodeContents(textNode);
      const textBounds = range.getBoundingClientRect();
      const containerBounds = container.getBoundingClientRect();

      return {
        position: {
          x: textBounds.left + textBounds.width / 2,
          y: textBounds.top + textBounds.height / 2,
        },
        textWidth: textBounds.width,
        containerWidth: containerBounds.width,
      };
    });

    await reactGrab.setupCallbackTracking();
    await reactGrab.activate();
    await reactGrab.page.mouse.move(target.position.x, target.position.y);

    await expect
      .poll(async () => (await reactGrab.getSelectionLabelInfo()).tagName)
      .toContain("Grab this text");

    const callbackHistory = await reactGrab.getCallbackHistory();
    const selectionBoxCall = callbackHistory.findLast(
      (callback) => callback.name === "onSelectionBox" && callback.args[0] === true,
    );
    expect(selectionBoxCall?.args[1]).toEqual(
      expect.objectContaining({
        width: target.textWidth,
      }),
    );
    expect(target.textWidth).toBeLessThan(target.containerWidth);

    const copyPayloadPromise = reactGrab.captureNextClipboardWrites();
    await reactGrab.page.mouse.click(target.position.x, target.position.y);
    const copyPayload = await copyPayloadPromise;
    const clipboardMetadataText = copyPayload["application/x-react-grab"];
    if (!clipboardMetadataText) throw new Error("Missing React Grab clipboard metadata");

    const clipboardMetadata = JSON.parse(clipboardMetadataText);
    expect(copyPayload["text/plain"]).toContain('"Grab this text"');
    expect(clipboardMetadata.entries).toHaveLength(1);
    expect(clipboardMetadata.entries[0].tagName).toContain("Grab this text");
    expect(clipboardMetadata.entries[0].content).toContain('"Grab this text"');
  });

  test("should keep text-only elements as element targets", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => {
      const target = document.createElement("div");
      target.id = "text-only-target";
      target.textContent = "Text-only target";
      target.style.cssText =
        "position:fixed;left:40px;top:40px;padding:12px;background:white;color:black;font:16px sans-serif;z-index:2147483000";
      document.body.append(target);
    });

    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("#text-only-target");

    await expect.poll(async () => (await reactGrab.getSelectionLabelInfo()).tagName).toBe("div");
  });

  test("should write React Grab clipboard metadata on copy", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-testid='todo-list'] h1");

    const copyPayloadPromise = reactGrab.captureNextClipboardWrites();
    await reactGrab.clickElement("[data-testid='todo-list'] h1");
    const copyPayload = await copyPayloadPromise;
    const clipboardMetadataText = copyPayload["application/x-react-grab"];
    if (!clipboardMetadataText) {
      throw new Error("Missing React Grab clipboard metadata");
    }

    const clipboardMetadata = JSON.parse(clipboardMetadataText);
    expect(clipboardMetadata.content).toContain("Todo List");
    expect(clipboardMetadata.entries).toHaveLength(1);
    expect(clipboardMetadata.entries[0].content).toContain("Todo List");
    expect(clipboardMetadata.entries[0].source).toMatchObject({
      componentName: "TodoList",
      filePath: "App.tsx",
      origin: "app",
    });
    expect(clipboardMetadata.entries[0].stackContext).toContain("TodoList");
    expect(Array.isArray(clipboardMetadata.entries[0].frames)).toBe(true);
    expect(clipboardMetadata.entries[0].frames.length).toBeGreaterThan(0);
  });

  // PR #349 ("fix: keep page interactive while grabbing") intentionally
  // stopped treating the copying state as a global selection-interaction
  // lock so that clicks, scrolling, and native text selection on the page
  // continue to work while React Grab finishes a slow copy hook.
  test("should keep page interactive (allowing text selection) while a copy is pending", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(() => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            unregisterPlugin: (name: string) => void;
            registerPlugin: (plugin: Record<string, unknown>) => void;
          };
        }
      ).__REACT_GRAB__;
      api?.unregisterPlugin("pending-copy-hook");
      api?.registerPlugin({
        name: "pending-copy-hook",
        hooks: {
          onBeforeCopy: () => new Promise<void>(() => {}),
        },
      });
    });

    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-testid='main-description']");
    await reactGrab.clickElement("[data-testid='main-description']");

    await expect
      .poll(async () => {
        const state = await reactGrab.getState();
        return state.isCopying;
      })
      .toBe(true);

    const description = reactGrab.page.locator("[data-testid='main-description']");
    const descriptionBounds = await description.boundingBox();
    if (!descriptionBounds) {
      throw new Error("Could not get main description bounds");
    }

    await reactGrab.page.mouse.move(
      descriptionBounds.x + 5,
      descriptionBounds.y + descriptionBounds.height / 2,
    );
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(
      descriptionBounds.x + descriptionBounds.width - 5,
      descriptionBounds.y + descriptionBounds.height / 2,
      { steps: 8 },
    );
    await reactGrab.page.mouse.up();

    const selectedText = await reactGrab.page.evaluate(() => {
      return window.getSelection()?.toString().trim() ?? "";
    });
    expect(selectedText).not.toBe("");
  });

  test("should highlight different elements when hovering", async ({ reactGrab }) => {
    await reactGrab.activate();

    await reactGrab.hoverUntilSelected("h1");

    await reactGrab.hoverUntilSelected("li:first-child");

    await reactGrab.hoverUntilSelected("ul");

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should deactivate after successful copy in toggle mode", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li");
    await reactGrab.clickElement("li");

    await expect.poll(() => reactGrab.isOverlayVisible(), { timeout: 3000 }).toBe(false);
  });

  test("should not show selection when inactive", async ({ reactGrab }) => {
    const isVisibleBefore = await reactGrab.isOverlayVisible();
    expect(isVisibleBefore).toBe(false);

    await reactGrab.hoverElement("li");

    const isVisibleAfter = await reactGrab.isOverlayVisible();
    expect(isVisibleAfter).toBe(false);
  });

  test("should select nested elements correctly", async ({ reactGrab }) => {
    await reactGrab.activate();

    await reactGrab.hoverUntilSelected("li:nth-child(3)");
    await reactGrab.clickElement("li:nth-child(3)");

    await expect.poll(() => reactGrab.getClipboardContent()).toBeTruthy();
  });

  test("should maintain selection target while hovering", async ({ reactGrab }) => {
    await reactGrab.activate();

    const listItem = reactGrab.page.locator("li").first();
    const box = await listItem.boundingBox();
    if (!box) throw new Error("Could not get bounding box");

    await reactGrab.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2 + 5);
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });
});

test.describe("Selection Bounds and Mutations", () => {
  test("selection box should update when element size changes", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("li:first-child");

    const initialBounds = await reactGrab.getSelectionBoxBounds();
    expect(initialBounds).not.toBeNull();

    await reactGrab.page.evaluate(() => {
      const element = document.querySelector("li:first-child") as HTMLElement;
      if (element) {
        element.style.height = "200px";
      }
    });

    await expect
      .poll(async () => {
        const bounds = await reactGrab.getSelectionBoxBounds();
        return bounds?.height ?? 0;
      })
      .toBeGreaterThan(initialBounds?.height ?? 0);
  });

  test("selection should handle element being hidden", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-testid='toggleable-element']");

    await reactGrab.hideElement("[data-testid='toggleable-element']");

    await reactGrab.hoverUntilSelected("li:first-child");

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("selection should recalculate after scroll", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("li:first-child");

    const boundsBefore = await reactGrab.getSelectionBoxBounds();

    await reactGrab.scrollPage(50);

    if (boundsBefore) {
      await expect
        .poll(async () => {
          const bounds = await reactGrab.getSelectionBoxBounds();
          return bounds?.y;
        })
        .not.toBe(boundsBefore.y);
    }
  });

  test("multiple selection boxes should display for drag selection", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.dragSelect("li:first-child", "li:nth-child(3)");
    await reactGrab.page.waitForTimeout(500);

    await expect
      .poll(async () => {
        const info = await reactGrab.getGrabbedBoxInfo();
        return info.count;
      })
      .toBeGreaterThan(1);
  });

  test("selection should work on deeply nested elements", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-testid='deeply-nested-text']");

    await reactGrab.clickElement("[data-testid='deeply-nested-text']");

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("deeply nested");
  });

  test("selects page content through a modal's body pointer-events:none", async ({
    reactGrab,
    page,
  }) => {
    // Open a Radix-style modal that sets `body { pointer-events: none }`.
    await page.locator("[data-testid='pe-modal-trigger']").click();
    await expect.poll(() => page.evaluate(() => document.body.style.pointerEvents)).toBe("none");

    await reactGrab.activate();
    // The hit-test override must see through the page's pointer-events:none so an
    // element outside the popover is still detectable. Without it,
    // elementsFromPoint returns nothing and selection never registers.
    await reactGrab.hoverUntilSelected("[data-testid='pe-outside-target']");
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);

    await reactGrab.clickElement("[data-testid='pe-outside-target']");
    await expect.poll(() => reactGrab.getClipboardContent()).toContain("outside the popover");
  });
});
