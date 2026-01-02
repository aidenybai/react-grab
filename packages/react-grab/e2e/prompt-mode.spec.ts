import { test, expect } from "./fixtures.js";

test.describe("Input Mode", () => {
  test.describe("Entering Input Mode", () => {
    test("double-click should enter input mode when agent is configured", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(true);
    });

    test("single click should copy without entering input mode when no agent", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("li:first-child");
      await reactGrab.page.waitForTimeout(500);

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toBeTruthy();
    });

    test("should focus input textarea when entering input mode", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      const isFocused = await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return false;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return false;
        const textarea = root.querySelector("textarea");
        return (
          document.activeElement === textarea ||
          shadowRoot.activeElement === textarea
        );
      }, "data-react-grab");

      expect(isFocused).toBe(true);
    });

    test("input mode should show input textarea", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("h1");
      await reactGrab.page.waitForTimeout(200);

      const hasTextarea = await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return false;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return false;
        return root.querySelector("textarea") !== null;
      }, "data-react-grab");

      expect(hasTextarea).toBe(true);
    });
  });

  test.describe("Text Input and Editing", () => {
    test("should accept text input", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Test prompt text");

      const inputValue = await reactGrab.getInputValue();
      expect(inputValue).toBe("Test prompt text");
    });

    test("should allow editing typed text", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Hello");
      await reactGrab.page.keyboard.press("Backspace");
      await reactGrab.page.keyboard.press("Backspace");
      await reactGrab.typeInInput("p!");

      const inputValue = await reactGrab.getInputValue();
      expect(inputValue).toBe("Help!");
    });

    test("should handle long text input", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      const longText =
        "This is a very long prompt that should be handled properly by the textarea input field and might need to scroll within the container.";
      await reactGrab.typeInInput(longText);

      const inputValue = await reactGrab.getInputValue();
      expect(inputValue).toBe(longText);
    });

    test("should handle multiline input with shift+enter", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Line 1");
      await reactGrab.page.keyboard.down("Shift");
      await reactGrab.page.keyboard.press("Enter");
      await reactGrab.page.keyboard.up("Shift");
      await reactGrab.typeInInput("Line 2");

      const inputValue = await reactGrab.getInputValue();
      expect(inputValue).toContain("Line 1");
      expect(inputValue).toContain("Line 2");
    });
  });

  test.describe("Submit and Cancel", () => {
    test("Enter key should submit input", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 100 });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Test prompt");
      await reactGrab.submitInput();
      await reactGrab.page.waitForTimeout(300);

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(false);
    });

    test("Escape should cancel input mode", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(100);

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(false);
    });

    test("Escape in textarea should dismiss input mode directly", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(300);

      const isPromptActive = await reactGrab.isPromptModeActive();
      expect(isPromptActive).toBe(true);

      await reactGrab.typeInInput("Some unsaved text");
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(300);

      const isStillPromptActive = await reactGrab.isPromptModeActive();
      expect(isStillPromptActive).toBe(false);
    });

    test("confirming dismiss should close input mode", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Some text");
      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(100);

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(false);
    });

    test("empty input should cancel without confirmation", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(100);

      const isPendingDismiss = await reactGrab.isPendingDismissVisible();
      expect(isPendingDismiss).toBe(false);
    });
  });

  test.describe("Input Mode with Selection", () => {
    test("should freeze selection while in input mode", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.page.mouse.move(500, 500);
      await reactGrab.page.waitForTimeout(100);

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(true);
    });

    test("input mode via drag selection should work", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();

      await reactGrab.dragSelect("li:first-child", "li:nth-child(3)");
      await reactGrab.page.waitForTimeout(300);

      const isContextMenuVisible = await reactGrab.isContextMenuVisible();
      expect(isContextMenuVisible).toBe(true);

      await reactGrab.clickContextMenuItem("Edit");
      await reactGrab.page.waitForTimeout(200);

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(true);
    });

    test("should show multi-element count in input mode", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();

      await reactGrab.dragSelect("li:first-child", "li:nth-child(3)");
      await reactGrab.page.waitForTimeout(300);

      await reactGrab.clickContextMenuItem("Edit");
      await reactGrab.page.waitForTimeout(200);

      const labelInfo = await reactGrab.getSelectionLabelInfo();
      expect(labelInfo.isVisible).toBe(true);
      expect(labelInfo.elementsCount).toBeGreaterThan(1);
    });
  });

  test.describe("Keyboard Shortcuts in Input Mode", () => {
    test("arrow keys should not navigate elements in input mode", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.pressArrowDown();

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(true);
    });

    test("activation shortcut should cancel input mode", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.page.keyboard.down("Meta");
      await reactGrab.page.keyboard.press("c");
      await reactGrab.page.keyboard.up("Meta");
      await reactGrab.page.waitForTimeout(100);

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(false);
    });
  });

  test.describe("Input Preservation", () => {
    test("input should be cleared after dismissing input mode", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Some text");
      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      const inputValue = await reactGrab.getInputValue();
      expect(inputValue).toBe("");
    });
  });

  test.describe("Edge Cases", () => {
    test("clicking outside should cancel input mode", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.page.mouse.click(10, 10);
      await reactGrab.page.waitForTimeout(100);

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(false);
    });

    test("double-click maintains overlay in input mode", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      const isPromptActive = await reactGrab.isPromptModeActive();
      expect(isPromptActive).toBe(true);

      const isOverlayActive = await reactGrab.isOverlayVisible();
      expect(isOverlayActive).toBe(true);
    });

    test("input mode should work after scroll", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.scrollPage(100);

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(true);
    });
  });
});
