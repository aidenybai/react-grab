import { test, expect } from "./fixtures.js";

test.describe("Drag Selection", () => {
  test("should create drag box when clicking and dragging", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("li").first();
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

  test("should select multiple elements within drag bounds", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    await reactGrab.dragSelect("li:first-child", "li:nth-child(3)");
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toBeTruthy();
    expect(clipboardContent.length).toBeGreaterThan(0);
  });

  test("should copy all selected elements to clipboard", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    await reactGrab.dragSelect("li:first-child", "li:nth-child(5)");
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();

    expect(clipboardContent).toContain("Buy groceries");
  });

  test("should cancel drag selection on Escape", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("li").first();
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

    const listItem = reactGrab.page.locator("li").first();
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

  test("should deactivate after drag selection in toggle mode", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    await reactGrab.dragSelect("li:first-child", "li:nth-child(2)");

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
    expect(clipboardContent).toContain("Buy groceries");
    expect(clipboardContent).toContain("Write tests");
  });

  test("should show visual feedback during drag", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("li").first();
    const lastItem = reactGrab.page.locator("li").last();

    const startBox = await firstItem.boundingBox();
    const endBox = await lastItem.boundingBox();
    if (!startBox || !endBox) throw new Error("Could not get bounding boxes");

    await reactGrab.page.mouse.move(startBox.x - 10, startBox.y - 10);
    await reactGrab.page.mouse.down();

    await reactGrab.page.mouse.move(
      endBox.x + endBox.width + 10,
      endBox.y + endBox.height + 10,
      { steps: 10 },
    );

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
  test("should handle drag selection with scroll offset", async ({
    reactGrab,
  }) => {
    await reactGrab.scrollPage(100);
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.activate();
    await reactGrab.dragSelect("li:first-child", "li:nth-child(2)");
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toBeTruthy();
  });

  test("should maintain drag while scrolling", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("li").first();
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

    const listItems = reactGrab.page.locator("li");
    const count = await listItems.count();

    if (count > 0) {
      await reactGrab.dragSelect("li:first-child", "li:nth-child(2)");
      await reactGrab.page.waitForTimeout(500);

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toBeTruthy();
    }
  });

  test("drag bounds should exist during drag operation", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("li").first();
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

  test("drag selection should work in scrollable container", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const scrollContainer = reactGrab.page.locator(
      "[data-testid='scroll-container']",
    );
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
