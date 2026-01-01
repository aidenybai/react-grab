import { test, expect } from "./fixtures.js";

test.describe("Keyboard Navigation", () => {
  test("should navigate to next element with ArrowDown", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowDown");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should navigate to previous element with ArrowUp", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:nth-child(3)");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowUp");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should navigate to parent element with ArrowLeft", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowLeft");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should navigate to child element with ArrowRight", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("ul");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowRight");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should maintain activation during keyboard navigation", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowDown");
    await reactGrab.page.keyboard.press("ArrowDown");
    await reactGrab.page.keyboard.press("ArrowUp");

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should copy element after keyboard navigation with click", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowDown");
    await reactGrab.waitForSelectionBox();

    const secondItem = reactGrab.page.locator(
      "[data-testid='todo-list'] li:nth-child(2)",
    );
    const box = await secondItem.boundingBox();
    if (box) {
      await reactGrab.page.mouse.click(box.x + 10, box.y + 10);
    }
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toBeTruthy();
  });

  test("should freeze selection when navigating with arrow keys", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowDown");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.mouse.move(0, 0);
    await reactGrab.page.waitForTimeout(100);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });
});

test.describe("Navigation History and Wrapping", () => {
  test("ArrowLeft should go back to previous element", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowDown();
    await reactGrab.pressArrowDown();

    await reactGrab.pressArrowLeft();
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("multiple ArrowDown should navigate through siblings", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowDown();
    await reactGrab.pressArrowDown();
    await reactGrab.pressArrowDown();
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("ArrowUp at first sibling should stay on element", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowUp();
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("ArrowDown at last sibling should stay on element", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:last-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowDown();
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("navigation should work on deeply nested elements", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='deeply-nested-text']");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowLeft();
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("keyboard navigation should update selection label", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    const labelBefore = await reactGrab.getSelectionLabelInfo();

    await reactGrab.pressArrowLeft();
    await reactGrab.waitForSelectionBox();

    const labelAfter = await reactGrab.getSelectionLabelInfo();

    expect(labelBefore.isVisible).toBe(true);
    expect(labelAfter.isVisible).toBe(true);
  });
});
