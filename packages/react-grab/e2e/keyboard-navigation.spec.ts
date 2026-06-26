import { expect, test, type ReactGrabPageObject } from "./fixtures.js";
import { isEditPanelVisible } from "./edit-panel-helpers.js";
import { ATTRIBUTE_NAME } from "./constants.js";

const clickSelectionDiscardButton = async (
  reactGrab: ReactGrabPageObject,
  action: "copy" | "yes",
  options: { programmatic?: boolean } = {},
): Promise<void> => {
  if (!options.programmatic) {
    await reactGrab.page.locator(`[data-react-grab-discard-${action}]`).click();
    return;
  }
  await reactGrab.page.evaluate(
    ({ attrName, actionName }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const button = shadowRoot?.querySelector<HTMLButtonElement>(
        `[data-react-grab-discard-${actionName}]`,
      );
      if (!button) throw new Error(`Discard ${actionName} button not found`);
      button.click();
    },
    { attrName: ATTRIBUTE_NAME, actionName: action },
  );
};

const getSelectionDiscardPromptState = async (
  reactGrab: ReactGrabPageObject,
): Promise<{
  promptText: string;
  labelText: string;
  hasCopy: boolean;
  hasNo: boolean;
  hasYes: boolean;
}> => {
  return reactGrab.page.evaluate((attrName) => {
    const host = document.querySelector(`[${attrName}]`);
    const shadowRoot = host?.shadowRoot;
    const label = shadowRoot?.querySelector<HTMLElement>("[data-react-grab-selection-label]");
    const prompt = shadowRoot?.querySelector<HTMLElement>("[data-react-grab-discard-prompt]");
    return {
      promptText: prompt?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      labelText: label?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      hasCopy: Boolean(prompt?.querySelector("[data-react-grab-discard-copy]")),
      hasNo: Boolean(prompt?.querySelector("[data-react-grab-discard-no]")),
      hasYes: Boolean(prompt?.querySelector("[data-react-grab-discard-yes]")),
    };
  }, ATTRIBUTE_NAME);
};

const showKeyboardSelectionDiscardPrompt = async (reactGrab: ReactGrabPageObject) => {
  await reactGrab.activate();
  await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
  await reactGrab.waitForSelectionBox();
  await reactGrab.pressArrowDown();
  await reactGrab.waitForSelectionBox();
  await reactGrab.page.mouse.move(0, 0);
  await expect.poll(() => reactGrab.isPendingDismissVisible()).toBe(true);
};

test.describe("Keyboard Navigation", () => {
  test("should navigate to next element with ArrowDown", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowDown");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should navigate to previous element with ArrowUp", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:nth-child(3)");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowUp");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should navigate to parent element with ArrowLeft", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowLeft");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should navigate to child element with ArrowRight", async ({ reactGrab }) => {
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

  test("should copy element after keyboard navigation with mouse-move prompt", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowDown");
    await reactGrab.waitForSelectionBox();

    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li:nth-child(2)");
    const box = await secondItem.boundingBox();
    if (box) {
      await reactGrab.page.mouse.move(box.x + 10, box.y + 10);
    }
    await expect.poll(() => reactGrab.isPendingDismissVisible()).toBe(true);
    await clickSelectionDiscardButton(reactGrab, "copy");

    await expect.poll(() => reactGrab.getClipboardContent(), { timeout: 5000 }).not.toBe("");
  });

  test("should copy keyboard-selected element when clicking over previous mouse target", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] h1");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowLeft");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.up();

    await expect.poll(() => reactGrab.getClipboardContent(), { timeout: 5000 }).toContain("[<div");
    expect(await reactGrab.getClipboardContent()).not.toContain("[<h1");
  });

  test("should offer Copy for keyboard-selected element after mouse movement", async ({
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
    await expect.poll(() => reactGrab.isPendingDismissVisible()).toBe(true);

    await clickSelectionDiscardButton(reactGrab, "copy");

    await expect.poll(() => reactGrab.getClipboardContent(), { timeout: 5000 }).not.toBe("");
  });

  test("should copy keyboard-selected element with Enter on focused Copy prompt button", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowUp");
    await reactGrab.waitForSelectionBox();
    await reactGrab.page.mouse.move(10, 10);
    await expect.poll(() => reactGrab.isPendingDismissVisible()).toBe(true);

    await reactGrab.page.locator("[data-react-grab-discard-copy]").focus();
    await reactGrab.page.keyboard.press("Enter");

    await expect.poll(() => reactGrab.getClipboardContent(), { timeout: 5000 }).not.toBe("");
  });

  test("should prompt before mouse movement discards arrow-key selection", async ({
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
    expect(await reactGrab.isPendingDismissVisible()).toBe(true);
    const prompt = await getSelectionDiscardPromptState(reactGrab);
    expect(prompt.promptText).toBe("Discard selection?CopyYes");
    expect(prompt.labelText).toBe("Discard selection?CopyYes");
    expect(prompt.hasCopy).toBe(true);
    expect(prompt.hasNo).toBe(false);
    expect(prompt.hasYes).toBe(true);
  });

  test("should discard arrow-key selection when confirming mouse handoff", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowDown");
    await reactGrab.waitForSelectionBox();
    const selectionBoundsAfterArrow = await reactGrab.getSelectionBoxBounds();
    expect(selectionBoundsAfterArrow).not.toBeNull();

    await reactGrab.page.mouse.move(0, 0);
    await expect.poll(() => reactGrab.isPendingDismissVisible()).toBe(true);
    await reactGrab.page.mouse.move(400, 400);
    await reactGrab.page.waitForTimeout(100);
    expect(await reactGrab.isPendingDismissVisible()).toBe(true);
    expect((await reactGrab.getState()).targetElement).toBeFalsy();

    await clickSelectionDiscardButton(reactGrab, "yes");
    await expect.poll(() => reactGrab.isPendingDismissVisible()).toBe(false);
  });

  test("Enter should continue through the discard-selection prompt", async ({ reactGrab }) => {
    await reactGrab.registerCommentAction();
    await showKeyboardSelectionDiscardPrompt(reactGrab);

    await reactGrab.pressEnter();

    await expect.poll(() => reactGrab.isPromptModeActive()).toBe(true);
    expect(await reactGrab.isPendingDismissVisible()).toBe(false);
  });

  test("S should continue through the discard-selection prompt", async ({ reactGrab }) => {
    await showKeyboardSelectionDiscardPrompt(reactGrab);

    await reactGrab.pressKey("s");

    await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(true);
    expect(await reactGrab.isPendingDismissVisible()).toBe(false);
  });

  test("Enter on the focused Copy button copies without opening the Style panel", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowUp");
    await reactGrab.waitForSelectionBox();
    await reactGrab.page.mouse.move(10, 10);
    await expect.poll(() => reactGrab.isPendingDismissVisible()).toBe(true);

    await reactGrab.page.locator("[data-react-grab-discard-copy]").focus();
    await reactGrab.page.keyboard.press("Enter");

    // Enter on Copy must copy, not fall through to the Enter-to-expand
    // shortcut that would open the Style panel.
    await expect.poll(() => reactGrab.getClipboardContent(), { timeout: 5000 }).not.toBe("");
    expect(await isEditPanelVisible(reactGrab.page)).toBe(false);
  });

  test("Enter on the focused Yes button discards without copying", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.keyboard.press("ArrowUp");
    await reactGrab.waitForSelectionBox();
    await reactGrab.page.mouse.move(10, 10);
    await expect.poll(() => reactGrab.isPendingDismissVisible()).toBe(true);

    await reactGrab.page.locator("[data-react-grab-discard-yes]").focus();
    await reactGrab.page.keyboard.press("Enter");

    await expect.poll(() => reactGrab.isPendingDismissVisible()).toBe(false);
    expect(await reactGrab.getClipboardContent()).toBe("");
  });

  test("arrow keys continue navigation while the discard-selection prompt is open", async ({
    reactGrab,
  }) => {
    await showKeyboardSelectionDiscardPrompt(reactGrab);

    await reactGrab.pressArrowDown();
    await reactGrab.waitForSelectionBox();

    expect(await reactGrab.isPendingDismissVisible()).toBe(false);
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
  });
});

test.describe("Navigation History and Wrapping", () => {
  interface ArrowUpBoundaryClickSelectionScenario {
    targetSelector: string;
    expectedClipboardContent: string;
    arrowUpPressCount: number;
  }

  const runArrowUpBoundaryClickSelectionScenario = async (
    reactGrab: ReactGrabPageObject,
    scenario: ArrowUpBoundaryClickSelectionScenario,
  ) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));

    for (let pressCount = 0; pressCount < scenario.arrowUpPressCount; pressCount++) {
      await reactGrab.pressArrowUp();
      await reactGrab.waitForSelectionBox();
    }

    await reactGrab.page.locator(scenario.targetSelector).hover({ force: true });
    await expect.poll(() => reactGrab.isPendingDismissVisible()).toBe(true);
    await clickSelectionDiscardButton(reactGrab, "yes", { programmatic: true });
    await reactGrab.page.locator(scenario.targetSelector).click({ force: true });

    await expect
      .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
      .toContain(scenario.expectedClipboardContent);
  };

  test("ArrowLeft should go back to previous element", async ({ reactGrab }) => {
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

  test("multiple ArrowDown should navigate through siblings", async ({ reactGrab }) => {
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

  test("ArrowUp at first sibling should stay on element", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowUp();
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("ArrowUp at first sibling should not lock later click selection", async ({ reactGrab }) => {
    await runArrowUpBoundaryClickSelectionScenario(reactGrab, {
      targetSelector: "[data-testid='nested-button']",
      expectedClipboardContent: "Nested Button",
      arrowUpPressCount: 1,
    });
  });

  test("repeated ArrowUp at first sibling should still allow click selection changes", async ({
    reactGrab,
  }) => {
    await runArrowUpBoundaryClickSelectionScenario(reactGrab, {
      targetSelector: "[data-testid='cancel-button']",
      expectedClipboardContent: "Cancel",
      arrowUpPressCount: 4,
    });
  });

  test("ArrowUp boundary should allow selecting form controls", async ({ reactGrab }) => {
    await runArrowUpBoundaryClickSelectionScenario(reactGrab, {
      targetSelector: "[data-testid='submit-button']",
      expectedClipboardContent: "Submit",
      arrowUpPressCount: 2,
    });
  });

  test("ArrowDown at last sibling should stay on element", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:last-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowDown();
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("navigation should work on deeply nested elements", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='deeply-nested-text']");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowLeft();
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("keyboard navigation should update selection label", async ({ reactGrab }) => {
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

test.describe("ArrowUp Vertical Traversal", () => {
  test("ArrowUp should reach parent element from child", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    const initialLabel = await reactGrab.getSelectionLabelInfo();

    await reactGrab.pressArrowUp();
    await reactGrab.waitForSelectionBox();

    const afterUpLabel = await reactGrab.getSelectionLabelInfo();

    expect(initialLabel.tagName).toBe("li");
    expect(afterUpLabel.tagName).not.toBe("li");
    expect(afterUpLabel.isVisible).toBe(true);
  });

  test("repeated ArrowUp should not oscillate between elements", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    const visitedTags: string[] = [];
    for (let step = 0; step < 8; step++) {
      await reactGrab.pressArrowUp();
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

  test("ArrowUp bounds should never shrink", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    let previousBounds = await reactGrab.getSelectionBoxBounds();
    expect(previousBounds).not.toBeNull();
    let boundsShrunk = false;

    for (let step = 0; step < 5; step++) {
      await reactGrab.pressArrowUp();
      await reactGrab.page.waitForTimeout(50);
      const currentBounds = await reactGrab.getSelectionBoxBounds();
      if (!currentBounds) break;

      const previousArea = previousBounds!.width * previousBounds!.height;
      const currentArea = currentBounds.width * currentBounds.height;
      if (currentArea < previousArea - 1) {
        boundsShrunk = true;
        break;
      }
      previousBounds = currentBounds;
    }

    expect(boundsShrunk).toBe(false);
  });

  test("ArrowDown should reverse ArrowUp and maintain selection", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowUp();
    await reactGrab.waitForSelectionBox();
    await reactGrab.pressArrowUp();
    await reactGrab.waitForSelectionBox();

    const afterUpVisible = await reactGrab.isSelectionBoxVisible();
    expect(afterUpVisible).toBe(true);

    await reactGrab.pressArrowDown();
    await reactGrab.waitForSelectionBox();
    await reactGrab.pressArrowDown();
    await reactGrab.waitForSelectionBox();

    const afterDownVisible = await reactGrab.isSelectionBoxVisible();
    expect(afterDownVisible).toBe(true);

    const afterDownBounds = await reactGrab.getSelectionBoxBounds();
    expect(afterDownBounds).not.toBeNull();
    expect(afterDownBounds!.width).toBeGreaterThan(0);
    expect(afterDownBounds!.height).toBeGreaterThan(0);
  });
});
