import { expect, test, type ReactGrabPageObject } from "./fixtures.js";

test.describe("Keyboard Navigation", () => {
  test("ArrowDown press should keep selection visible", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowDown");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("ArrowUp press should keep selection visible", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:nth-child(3)");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowUp");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("ArrowLeft press should keep selection visible", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowLeft");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("ArrowRight press should keep selection visible", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("ul");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowRight");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should maintain activation during keyboard navigation", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowDown");
    await reactGrab.page.keyboard.press("ArrowDown");
    await reactGrab.page.keyboard.press("ArrowUp");

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should copy element after keyboard navigation with click", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowDown");
    await reactGrab.waitForSelectionBox();

    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li:nth-child(2)");
    const box = await secondItem.boundingBox();
    if (box) {
      await reactGrab.page.mouse.click(box.x + 10, box.y + 10);
    }
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toBeTruthy();
  });

  test("should copy keyboard-selected element when clicking after mouse movement", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    const initialBounds = await reactGrab.getSelectionBoxBounds();
    expect(initialBounds).not.toBeNull();

    await reactGrab.page.keyboard.press("ArrowUp");
    await reactGrab.waitForSelectionBox();

    const selectionBoundsAfterArrow = await reactGrab.getSelectionBoxBounds();
    expect(selectionBoundsAfterArrow).not.toBeNull();

    await reactGrab.page.mouse.move(10, 10);
    await reactGrab.page.waitForTimeout(50);

    await reactGrab.page.mouse.click(
      selectionBoundsAfterArrow!.x + selectionBoundsAfterArrow!.width / 2,
      selectionBoundsAfterArrow!.y + selectionBoundsAfterArrow!.height / 2,
    );
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toBeTruthy();
  });

  test("should freeze selection when navigating with arrow keys", async ({ reactGrab }) => {
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

test.describe("Keyboard Pointer Movement", () => {
  test("holding ArrowDown slides the selection onto a different element", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    const startLabel = await reactGrab.getSelectionLabelInfo();
    expect(startLabel.isVisible).toBe(true);
    expect(startLabel.tagName).toBe("li");

    await reactGrab.holdArrowKey("ArrowDown", 800);
    await reactGrab.waitForSelectionBox();

    const endLabel = await reactGrab.getSelectionLabelInfo();
    expect(endLabel.isVisible).toBe(true);
    expect(endLabel.tagName).not.toBeNull();
  });

  test("holding ArrowDown then releasing freezes selection against further mouse movement", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.holdArrowKey("ArrowDown", 500);
    await reactGrab.waitForSelectionBox();

    const restingLabel = await reactGrab.getSelectionLabelInfo();
    expect(restingLabel.isVisible).toBe(true);

    await reactGrab.page.mouse.move(2, 2);
    await reactGrab.page.waitForTimeout(150);

    const afterMoveLabel = await reactGrab.getSelectionLabelInfo();
    expect(afterMoveLabel.tagName).toBe(restingLabel.tagName);
    expect(afterMoveLabel.componentName).toBe(restingLabel.componentName);
  });

  test("releasing arrow over blank space should fall back to the seed element", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    const seedLabel = await reactGrab.getSelectionLabelInfo();
    expect(seedLabel.tagName).toBe("li");

    await reactGrab.holdArrowKey("ArrowUp", 2000);
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);

    await reactGrab.page.mouse.move(0, 0);
    await reactGrab.page.waitForTimeout(150);

    const afterMoveVisible = await reactGrab.isSelectionBoxVisible();
    expect(afterMoveVisible).toBe(true);
  });

  test("Tab while arrow key is still held should preserve the ancestor selection", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    const startLabel = await reactGrab.getSelectionLabelInfo();
    expect(startLabel.tagName).toBe("li");

    await reactGrab.page.keyboard.down("ArrowDown");
    await reactGrab.page.waitForTimeout(300);

    await reactGrab.page.keyboard.press("Tab");
    await reactGrab.waitForSelectionBox();

    const afterTabLabel = await reactGrab.getSelectionLabelInfo();
    expect(afterTabLabel.tagName).not.toBe("li");

    await reactGrab.page.waitForTimeout(150);
    await reactGrab.page.keyboard.up("ArrowDown");
    await reactGrab.page.waitForTimeout(150);

    const afterReleaseLabel = await reactGrab.getSelectionLabelInfo();
    expect(afterReleaseLabel.tagName).toBe(afterTabLabel.tagName);
    expect(afterReleaseLabel.componentName).toBe(afterTabLabel.componentName);
  });

  test("multiple arrow keys held together keep selection visible", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.down("ArrowRight");
    await reactGrab.page.keyboard.down("ArrowDown");
    await reactGrab.page.waitForTimeout(400);
    await reactGrab.page.keyboard.up("ArrowRight");
    await reactGrab.page.keyboard.up("ArrowDown");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });
});

test.describe("Tab Ancestor Stack Navigation", () => {
  interface TabBoundaryClickSelectionScenario {
    targetSelector: string;
    expectedClipboardContent: string;
    tabPressCount: number;
  }

  const runTabBoundaryClickSelectionScenario = async (
    reactGrab: ReactGrabPageObject,
    scenario: TabBoundaryClickSelectionScenario,
  ) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));

    for (let pressCount = 0; pressCount < scenario.tabPressCount; pressCount++) {
      await reactGrab.pressTab();
      await reactGrab.waitForSelectionBox();
    }

    await reactGrab.page.locator(scenario.targetSelector).click({ force: true });

    await expect
      .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
      .toContain(scenario.expectedClipboardContent);
  };

  test("Shift+Tab should go back to previous element", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressTab();
    await reactGrab.pressTab();

    await reactGrab.pressShiftTab();
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("Tab should reach parent element from child", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    const initialLabel = await reactGrab.getSelectionLabelInfo();

    await reactGrab.pressTab();
    await reactGrab.waitForSelectionBox();

    const afterTabLabel = await reactGrab.getSelectionLabelInfo();

    expect(initialLabel.tagName).toBe("li");
    expect(afterTabLabel.tagName).not.toBe("li");
    expect(afterTabLabel.isVisible).toBe(true);
  });

  test("repeated Tab should not oscillate between elements", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    const visitedTags: string[] = [];
    for (let step = 0; step < 8; step++) {
      await reactGrab.pressTab();
      await reactGrab.page.waitForTimeout(50);
      const labelInfo = await reactGrab.getSelectionLabelInfo();
      if (!labelInfo.isVisible) break;
      visitedTags.push(labelInfo.tagName ?? "unknown");
    }

    let oscillationCount = 0;
    for (let index = 2; index < visitedTags.length; index++) {
      const isRepeatingTwoStepPattern =
        visitedTags[index] === visitedTags[index - 2] &&
        visitedTags[index] !== visitedTags[index - 1];
      if (isRepeatingTwoStepPattern) {
        oscillationCount++;
      }
    }
    expect(oscillationCount).toBeLessThan(2);
  });

  test("Tab bounds should never shrink", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    let previousBounds = await reactGrab.getSelectionBoxBounds();
    expect(previousBounds).not.toBeNull();
    let didBoundsShrink = false;

    for (let step = 0; step < 5; step++) {
      await reactGrab.pressTab();
      await reactGrab.page.waitForTimeout(50);
      const currentBounds = await reactGrab.getSelectionBoxBounds();
      if (!currentBounds) break;

      const previousArea = previousBounds!.width * previousBounds!.height;
      const currentArea = currentBounds.width * currentBounds.height;
      if (currentArea < previousArea - 1) {
        didBoundsShrink = true;
        break;
      }
      previousBounds = currentBounds;
    }

    expect(didBoundsShrink).toBe(false);
  });

  test("Shift+Tab should reverse Tab and maintain selection", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressTab();
    await reactGrab.waitForSelectionBox();
    await reactGrab.pressTab();
    await reactGrab.waitForSelectionBox();

    const afterTabVisible = await reactGrab.isSelectionBoxVisible();
    expect(afterTabVisible).toBe(true);

    await reactGrab.pressShiftTab();
    await reactGrab.waitForSelectionBox();
    await reactGrab.pressShiftTab();
    await reactGrab.waitForSelectionBox();

    const afterShiftTabVisible = await reactGrab.isSelectionBoxVisible();
    expect(afterShiftTabVisible).toBe(true);

    const afterShiftTabBounds = await reactGrab.getSelectionBoxBounds();
    expect(afterShiftTabBounds).not.toBeNull();
    expect(afterShiftTabBounds!.width).toBeGreaterThan(0);
    expect(afterShiftTabBounds!.height).toBeGreaterThan(0);
  });

  test("Tab at first sibling should not lock later click selection", async ({ reactGrab }) => {
    await runTabBoundaryClickSelectionScenario(reactGrab, {
      targetSelector: "[data-testid='nested-button']",
      expectedClipboardContent: "Nested Button",
      tabPressCount: 1,
    });
  });

  test("repeated Tab should still allow click selection changes", async ({ reactGrab }) => {
    await runTabBoundaryClickSelectionScenario(reactGrab, {
      targetSelector: "[data-testid='cancel-button']",
      expectedClipboardContent: "Cancel",
      tabPressCount: 4,
    });
  });

  test("Tab boundary should allow selecting form controls", async ({ reactGrab }) => {
    await runTabBoundaryClickSelectionScenario(reactGrab, {
      targetSelector: "[data-testid='submit-button']",
      expectedClipboardContent: "Submit",
      tabPressCount: 2,
    });
  });

  test("Tab navigation should work on deeply nested elements", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='deeply-nested-text']");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressTab();
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("Tab navigation should update selection label", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    const labelBefore = await reactGrab.getSelectionLabelInfo();

    await reactGrab.pressTab();
    await reactGrab.waitForSelectionBox();

    const labelAfter = await reactGrab.getSelectionLabelInfo();

    expect(labelBefore.isVisible).toBe(true);
    expect(labelAfter.isVisible).toBe(true);
  });
});
