import { test, expect } from "./fixtures.js";

test.describe("Prompt Mode", () => {
  test.describe("Entering Prompt Mode", () => {
    test("context menu Comment should enter prompt mode when the action is registered", async ({
      reactGrab,
    }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.rightClickElement("li:first-child");
      await reactGrab.clickContextMenuItem("Comment");

      await expect.poll(() => reactGrab.isPromptModeActive()).toBe(true);
    });

    test("single click should copy without entering prompt mode", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.clickElement("li:first-child");

      await expect.poll(() => reactGrab.getClipboardContent()).toBeTruthy();
    });

    test("should focus input textarea when entering prompt mode", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

      const isFocused = await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return false;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return false;
        const textarea = root.querySelector("textarea");
        return document.activeElement === textarea || shadowRoot.activeElement === textarea;
      }, "data-react-grab");

      expect(isFocused).toBe(true);
    });

    test("prompt mode should show input textarea", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("h1");

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

    test("comment composer should use a multiline input with a separate submit row", async ({
      reactGrab,
    }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("h1");

      const initialLayout = await reactGrab.page.evaluate(() => {
        const host = document.querySelector("[data-react-grab]");
        const shadowRoot = host?.shadowRoot;
        const textarea = shadowRoot?.querySelector<HTMLTextAreaElement>(
          "textarea[data-react-grab-input]",
        );
        const submitButton = shadowRoot?.querySelector<HTMLButtonElement>(
          "[data-react-grab-submit]",
        );
        if (!textarea || !submitButton) return null;

        const textareaBounds = textarea.getBoundingClientRect();
        const submitButtonBounds = submitButton.getBoundingClientRect();
        return {
          textareaHeight: textareaBounds.height,
          textareaWidth: textareaBounds.width,
          textareaBottom: textareaBounds.bottom,
          submitButtonTop: submitButtonBounds.top,
          transitionProperty: getComputedStyle(textarea).transitionProperty,
        };
      });

      expect(initialLayout).not.toBeNull();
      expect(initialLayout?.textareaHeight).toBeGreaterThanOrEqual(32);
      expect(initialLayout?.textareaWidth).toBeGreaterThanOrEqual(240);
      expect(initialLayout?.submitButtonTop).toBeGreaterThan(initialLayout?.textareaBottom ?? 0);
      expect(initialLayout?.transitionProperty).toContain("height");

      await reactGrab.typeInInput("First line\nSecond line\nThird line");

      await expect
        .poll(() =>
          reactGrab.page.evaluate(() => {
            const host = document.querySelector("[data-react-grab]");
            const textarea = host?.shadowRoot?.querySelector<HTMLTextAreaElement>(
              "textarea[data-react-grab-input]",
            );
            return textarea?.getBoundingClientRect().height ?? 0;
          }),
        )
        .toBeGreaterThan(initialLayout?.textareaHeight ?? 0);
    });
  });

  test.describe("Prompt Mode Control", () => {
    test("API toggle should exit prompt mode", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.toggle();

      await expect.poll(() => reactGrab.isOverlayVisible(), { timeout: 2000 }).toBe(false);
      expect(await reactGrab.isPromptModeActive()).toBe(false);
    });
  });

  test.describe("Text Input and Editing", () => {
    test("should accept text input", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Test prompt text");

      const inputValue = await reactGrab.getInputValue();
      expect(inputValue).toBe("Test prompt text");
    });

    test("should allow editing typed text", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Hello");
      await reactGrab.page.keyboard.press("Backspace");
      await reactGrab.page.keyboard.press("Backspace");
      await reactGrab.typeInInput("p!");

      const inputValue = await reactGrab.getInputValue();
      expect(inputValue).toBe("Help!");
    });

    test("should handle long text input", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

      const longText =
        "This is a very long prompt that should be handled properly by the textarea input field and might need to scroll within the container.";
      await reactGrab.typeInInput(longText);

      const inputValue = await reactGrab.getInputValue();
      expect(inputValue).toBe(longText);
    });

    test("should handle multiline input with shift+enter", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

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
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Test prompt");
      await reactGrab.submitInput();

      await expect.poll(() => reactGrab.isPromptModeActive()).toBe(false);
    });

    test("Escape should cancel prompt mode", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.pressEscape();

      await expect.poll(() => reactGrab.isPromptModeActive()).toBe(false);
    });

    test("Escape in textarea should dismiss prompt mode directly", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

      expect(await reactGrab.isPromptModeActive()).toBe(true);

      await reactGrab.typeInInput("Some unsaved text");

      await reactGrab.pressEscape();

      await expect.poll(() => reactGrab.isPromptModeActive()).toBe(false);
    });

    test("confirming dismiss should close prompt mode", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Some text");
      await reactGrab.pressEscape();
      await reactGrab.pressEscape();

      await expect.poll(() => reactGrab.isOverlayVisible()).toBe(false);
    });

    test("empty input should cancel without confirmation", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.pressEscape();

      const isPendingDismiss = await reactGrab.isPendingDismissVisible();
      expect(isPendingDismiss).toBe(false);
    });
  });

  test.describe("Prompt Mode with Selection", () => {
    test("should freeze selection while in prompt mode", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.page.mouse.move(500, 500);

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(true);
    });
  });

  test.describe("Keyboard Shortcuts in Prompt Mode", () => {
    test("arrow keys should not navigate elements in prompt mode", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child span");
      await reactGrab.typeInInput("Line 1\nLine 2");

      await reactGrab.pressArrowDown();

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(true);
      expect(await reactGrab.getInputValue()).toBe("Line 1\nLine 2");
      const isFirstItemStillSelected = await reactGrab.page.evaluate(() => {
        const firstItem = document.querySelector("li:first-child span");
        return window.__REACT_GRAB__?.getState().targetElement === firstItem;
      });
      expect(isFirstItemStillSelected).toBe(true);
    });

    test("activation shortcut should not cancel prompt mode when input is focused", async ({
      reactGrab,
    }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.page.keyboard.down(reactGrab.modifierKey);
      await reactGrab.page.keyboard.press("c");
      await reactGrab.page.keyboard.up(reactGrab.modifierKey);

      await expect.poll(() => reactGrab.isPromptModeActive()).toBe(true);
    });
  });

  test.describe("Input Preservation", () => {
    test("input should be cleared after dismissing prompt mode", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Some text");
      await reactGrab.pressEscape();

      await reactGrab.enterPromptMode("li:first-child");

      const inputValue = await reactGrab.getInputValue();
      expect(inputValue).toBe("");
    });
  });

  test.describe("Edge Cases", () => {
    test("clicking outside should cancel prompt mode", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.page.mouse.click(10, 10);
      await reactGrab.page.mouse.click(10, 10);

      await expect.poll(() => reactGrab.isPromptModeActive()).toBe(false);
    });

    test("comment prompt mode maintains the overlay", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.enterPromptMode("li:first-child");

      const isPromptActive = await reactGrab.isPromptModeActive();
      expect(isPromptActive).toBe(true);

      const isOverlayActive = await reactGrab.isOverlayVisible();
      expect(isOverlayActive).toBe(true);
    });

    test("prompt mode should work after scroll", async ({ reactGrab }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.activate();
      await reactGrab.scrollPage(100);

      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.rightClickElement("li:first-child");
      await reactGrab.clickContextMenuItem("Comment");

      await expect.poll(() => reactGrab.isPromptModeActive()).toBe(true);
    });
  });
});
