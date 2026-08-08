import { test, expect } from "./fixtures.js";
import type { ReactGrabPageObject } from "./fixtures.js";

const TODO_LIST_ITEM_SELECTOR = "[data-testid='todo-list'] li";

const configureWideTextTarget = async (reactGrab: ReactGrabPageObject): Promise<void> => {
  await reactGrab.page.evaluate(() => {
    const paragraphElement = document.querySelector("[data-testid='main-description']");
    if (!(paragraphElement instanceof HTMLElement)) {
      throw new Error("Could not find a text target inside the app scope");
    }
    for (const pageElement of document.body.querySelectorAll("*")) {
      if (
        pageElement instanceof HTMLElement &&
        pageElement !== paragraphElement &&
        !pageElement.closest("[data-react-grab]")
      ) {
        pageElement.style.visibility = "hidden";
      }
    }
    paragraphElement.id = "wide-text-drag-target";
    paragraphElement.textContent = "Short label";
    Object.assign(paragraphElement.style, {
      font: "20px sans-serif",
      height: "40px",
      left: "20px",
      lineHeight: "40px",
      margin: "0",
      position: "fixed",
      top: "80px",
      visibility: "visible",
      width: "500px",
      zIndex: "10000",
    });

    const trackingWindow = window as Window & { __WIDE_TEXT_DRAG_TARGET_IDS__?: string[] };
    trackingWindow.__WIDE_TEXT_DRAG_TARGET_IDS__ = [];
    const api = window.__REACT_GRAB__;
    api?.unregisterPlugin("wide-text-drag-tracking");
    api?.registerPlugin({
      name: "wide-text-drag-tracking",
      hooks: {
        onDragEnd: (selectedElements: Element[]) => {
          trackingWindow.__WIDE_TEXT_DRAG_TARGET_IDS__ = selectedElements.map(
            (selectedElement) => selectedElement.id,
          );
        },
      },
    });
  });
};

const getWideTextDragTargetIds = async (reactGrab: ReactGrabPageObject): Promise<string[]> =>
  reactGrab.page.evaluate(
    () =>
      (window as Window & { __WIDE_TEXT_DRAG_TARGET_IDS__?: string[] })
        .__WIDE_TEXT_DRAG_TARGET_IDS__ ?? [],
  );

test.describe("Drag Selection", () => {
  test("should keep drag active when releasing Space in hold mode with Space activation key", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.updateOptions({
      activationKey: "Space",
      activationMode: "hold",
      keyHoldDuration: 0,
    });

    const firstItem = reactGrab.page.locator(TODO_LIST_ITEM_SELECTOR).first();
    const firstBox = await firstItem.boundingBox();
    if (!firstBox) throw new Error("Could not get bounding box");

    const startX = firstBox.x - 20;
    const startY = firstBox.y - 20;

    await reactGrab.page.mouse.move(startX, startY);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(startX + 220, startY + 150, { steps: 8 });
    await reactGrab.page.waitForTimeout(100);

    const boundsBeforeSpaceRelease = await reactGrab.getDragBoxBounds();
    expect(boundsBeforeSpaceRelease).not.toBeNull();
    if (!boundsBeforeSpaceRelease) throw new Error("Expected drag bounds before space release");

    await reactGrab.page.keyboard.down("Space");
    await reactGrab.page.keyboard.up("Space");
    await reactGrab.page.mouse.move(startX + 280, startY + 190, { steps: 4 });
    await reactGrab.page.waitForTimeout(100);
    expect(await reactGrab.isOverlayVisible()).toBe(true);

    const boundsAfterSpaceRelease = await reactGrab.getDragBoxBounds();
    expect(boundsAfterSpaceRelease).not.toBeNull();
    if (!boundsAfterSpaceRelease) throw new Error("Expected drag bounds after space release");

    await reactGrab.page.mouse.up();
  });

  test("should keep drag selection while moving it with held space", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator(TODO_LIST_ITEM_SELECTOR).first();
    const firstBox = await firstItem.boundingBox();
    if (!firstBox) throw new Error("Could not get bounding box");

    const startX = firstBox.x - 20;
    const startY = firstBox.y - 20;

    await reactGrab.page.mouse.move(startX, startY);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(startX + 220, startY + 150, { steps: 8 });
    await reactGrab.page.waitForTimeout(100);

    const boundsBeforeSpace = await reactGrab.getDragBoxBounds();
    expect(boundsBeforeSpace).not.toBeNull();
    if (!boundsBeforeSpace) throw new Error("Expected drag bounds before space hold");

    await reactGrab.page.keyboard.down("Space");
    await reactGrab.page.mouse.move(startX + 300, startY + 210, { steps: 6 });
    await reactGrab.page.waitForTimeout(100);

    const boundsWhileSpaceHeld = await reactGrab.getDragBoxBounds();
    expect(boundsWhileSpaceHeld).not.toBeNull();
    if (!boundsWhileSpaceHeld) throw new Error("Expected drag bounds while holding space");

    expect(Math.abs(boundsWhileSpaceHeld.width - boundsBeforeSpace.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(boundsWhileSpaceHeld.height - boundsBeforeSpace.height)).toBeLessThanOrEqual(2);
    expect(boundsWhileSpaceHeld.x).toBeGreaterThan(boundsBeforeSpace.x + 40);
    expect(boundsWhileSpaceHeld.y).toBeGreaterThan(boundsBeforeSpace.y + 30);

    await reactGrab.page.keyboard.up("Space");
    await reactGrab.page.mouse.move(startX + 340, startY + 250, { steps: 4 });
    await reactGrab.page.waitForTimeout(100);

    const boundsAfterSpaceRelease = await reactGrab.getDragBoxBounds();
    expect(boundsAfterSpaceRelease).not.toBeNull();
    if (!boundsAfterSpaceRelease) throw new Error("Expected drag bounds after releasing space");

    const didWidthGrowAfterRelease =
      boundsAfterSpaceRelease.width > boundsWhileSpaceHeld.width + 20;
    const didHeightGrowAfterRelease =
      boundsAfterSpaceRelease.height > boundsWhileSpaceHeld.height + 20;
    expect(didWidthGrowAfterRelease || didHeightGrowAfterRelease).toBe(true);

    await reactGrab.page.mouse.up();
  });

  test("should create drag box when clicking and dragging", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator(TODO_LIST_ITEM_SELECTOR).first();
    const firstBox = await firstItem.boundingBox();
    if (!firstBox) throw new Error("Could not get bounding box");

    const startX = firstBox.x - 20;
    const startY = firstBox.y - 20;

    await reactGrab.page.mouse.move(startX, startY);
    await reactGrab.page.mouse.down();
    await reactGrab.page.waitForTimeout(50);

    await reactGrab.page.mouse.move(startX + 100, startY + 100, { steps: 5 });
    await reactGrab.page.waitForTimeout(100);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);

    await reactGrab.page.mouse.up();
  });

  test("should select multiple elements within drag bounds", async ({ reactGrab }) => {
    await reactGrab.activate();

    await reactGrab.dragSelect(
      `${TODO_LIST_ITEM_SELECTOR}:first-child`,
      `${TODO_LIST_ITEM_SELECTOR}:nth-child(3)`,
    );
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toBeTruthy();
    expect(clipboardContent.length).toBeGreaterThan(0);
  });

  test("should ignore empty space inside a wide text layout box", async ({ reactGrab }) => {
    await configureWideTextTarget(reactGrab);
    await reactGrab.activate();

    const paragraphBounds = await reactGrab.page.locator("#wide-text-drag-target").boundingBox();
    if (!paragraphBounds) throw new Error("Could not get wide text bounds");

    await reactGrab.page.mouse.move(paragraphBounds.x + 300, paragraphBounds.y + 5);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(paragraphBounds.x + 450, paragraphBounds.y + 35, {
      steps: 5,
    });
    await reactGrab.page.mouse.up();

    expect(await getWideTextDragTargetIds(reactGrab)).not.toContain("wide-text-drag-target");
  });

  test("should drag-select the painted part of a wide text element", async ({ reactGrab }) => {
    await configureWideTextTarget(reactGrab);
    await reactGrab.activate();

    const textBounds = await reactGrab.page
      .locator("#wide-text-drag-target")
      .evaluate((element) => {
        const textNode = element.firstChild;
        if (!textNode) return null;
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const bounds = range.getBoundingClientRect();
        return { bottom: bounds.bottom, left: bounds.left, right: bounds.right, top: bounds.top };
      });
    if (!textBounds) throw new Error("Could not get painted text bounds");

    await reactGrab.page.mouse.move(textBounds.left - 10, textBounds.top - 5);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(textBounds.right + 10, textBounds.bottom + 5, { steps: 5 });
    await reactGrab.page.mouse.up();

    expect(await getWideTextDragTargetIds(reactGrab)).toContain("wide-text-drag-target");
  });

  test("should copy all selected elements to clipboard", async ({ reactGrab }) => {
    await reactGrab.activate();

    await reactGrab.dragSelect(
      `${TODO_LIST_ITEM_SELECTOR}:first-child`,
      `${TODO_LIST_ITEM_SELECTOR}:nth-child(5)`,
    );
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();

    expect(clipboardContent).toContain("TodoList");
  });

  test("should cancel drag selection on Escape", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator(TODO_LIST_ITEM_SELECTOR).first();
    const firstBox = await firstItem.boundingBox();
    if (!firstBox) throw new Error("Could not get bounding box");

    await reactGrab.page.mouse.move(firstBox.x - 10, firstBox.y - 10);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(firstBox.x + 200, firstBox.y + 200, {
      steps: 5,
    });

    await reactGrab.pressEscape();
    await reactGrab.page.mouse.up();

    await reactGrab.page.waitForTimeout(100);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(false);
  });

  test("should not trigger drag for small movements", async ({ reactGrab }) => {
    await reactGrab.activate();

    const listItem = reactGrab.page.locator(TODO_LIST_ITEM_SELECTOR).first();
    const box = await listItem.boundingBox();
    if (!box) throw new Error("Could not get bounding box");

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    await reactGrab.page.mouse.move(centerX, centerY);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(centerX + 1, centerY + 1);
    await reactGrab.page.mouse.up();

    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toBeTruthy();
  });

  test("should deactivate after drag selection in toggle mode", async ({ reactGrab }) => {
    await reactGrab.activate();

    await reactGrab.dragSelect(
      `${TODO_LIST_ITEM_SELECTOR}:first-child`,
      `${TODO_LIST_ITEM_SELECTOR}:nth-child(2)`,
    );

    await reactGrab.page.waitForTimeout(2000);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(false);
  });

  test("should handle drag across entire list", async ({ reactGrab }) => {
    await reactGrab.activate();

    await reactGrab.dragSelect(
      "[data-testid='todo-list'] li:first-child",
      "[data-testid='todo-list'] li:last-child",
    );
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toBeTruthy();
    expect(clipboardContent).toContain("TodoList");
  });

  test("should show visual feedback during drag", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator(TODO_LIST_ITEM_SELECTOR).first();
    const lastItem = reactGrab.page.locator(TODO_LIST_ITEM_SELECTOR).last();

    const startBox = await firstItem.boundingBox();
    const endBox = await lastItem.boundingBox();
    if (!startBox || !endBox) throw new Error("Could not get bounding boxes");

    await reactGrab.page.mouse.move(startBox.x - 10, startBox.y - 10);
    await reactGrab.page.mouse.down();

    await reactGrab.page.mouse.move(endBox.x + endBox.width + 10, endBox.y + endBox.height + 10, {
      steps: 10,
    });

    const hasContent = await reactGrab.page.evaluate(() => {
      const host = document.querySelector("[data-react-grab]");
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const root = shadowRoot.querySelector("[data-react-grab]");
      return root !== null && root.innerHTML.length > 0;
    });

    expect(hasContent).toBe(true);

    await reactGrab.page.mouse.up();
  });
});

test.describe("Drag Selection with Scroll", () => {
  test("should handle drag selection with scroll offset", async ({ reactGrab }) => {
    await reactGrab.scrollPage(100);
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.activate();
    await reactGrab.dragSelect(
      `${TODO_LIST_ITEM_SELECTOR}:first-child`,
      `${TODO_LIST_ITEM_SELECTOR}:nth-child(2)`,
    );
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toBeTruthy();
  });

  test("should maintain drag while scrolling", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator(TODO_LIST_ITEM_SELECTOR).first();
    const firstBox = await firstItem.boundingBox();
    if (!firstBox) throw new Error("Could not get bounding box");

    await reactGrab.page.mouse.move(firstBox.x - 10, firstBox.y - 10);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(firstBox.x + 100, firstBox.y + 100, {
      steps: 5,
    });

    await reactGrab.scrollPage(50);
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.page.mouse.up();

    const state = await reactGrab.getState();
    expect(state).toBeDefined();
  });

  test("should select elements after scrolling down", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.scrollPage(300);
    await reactGrab.page.waitForTimeout(200);

    const listItems = reactGrab.page.locator(TODO_LIST_ITEM_SELECTOR);
    const count = await listItems.count();

    if (count > 0) {
      await reactGrab.dragSelect(
        `${TODO_LIST_ITEM_SELECTOR}:first-child`,
        `${TODO_LIST_ITEM_SELECTOR}:nth-child(2)`,
      );
      await reactGrab.page.waitForTimeout(500);

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toBeTruthy();
    }
  });

  test("drag bounds should exist during drag operation", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator(TODO_LIST_ITEM_SELECTOR).first();
    const firstBox = await firstItem.boundingBox();
    if (!firstBox) throw new Error("Could not get bounding box");

    await reactGrab.page.mouse.move(firstBox.x - 10, firstBox.y - 10);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(firstBox.x + 200, firstBox.y + 200, {
      steps: 5,
    });
    await reactGrab.page.waitForTimeout(100);

    const bounds = await reactGrab.getDragBoxBounds();
    expect(bounds).not.toBeNull();

    await reactGrab.page.mouse.up();
  });

  test("drag selection should work in scrollable container", async ({ reactGrab }) => {
    await reactGrab.activate();

    const scrollContainer = reactGrab.page.locator("[data-testid='scroll-container']");
    const box = await scrollContainer.boundingBox();

    if (box) {
      await reactGrab.page.mouse.move(box.x + 10, box.y + 10);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 200, box.y + 100, { steps: 5 });
      await reactGrab.page.mouse.up();
      await reactGrab.page.waitForTimeout(500);

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toBeTruthy();
    }
  });
});
