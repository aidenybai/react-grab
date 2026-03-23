import { test, expect } from "./fixtures.js";
import type { ReactGrabPageObject } from "./fixtures.js";

const copyElement = async (
  reactGrab: ReactGrabPageObject,
  selector: string,
) => {
  await reactGrab.registerCommentAction();
  await reactGrab.enterPromptMode(selector);
  await reactGrab.typeInInput("comment");
  await reactGrab.submitInput();
  await expect
    .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
    .toBeTruthy();
  // HACK: Wait for copy feedback transition and comments item addition
  await reactGrab.page.waitForTimeout(300);
};

test.describe("Toolbar Copy All Button", () => {
  test.describe("Visibility", () => {
    test("should not be visible before comments dropdown is open", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      const isVisible = await reactGrab.isToolbarCopyAllVisible();
      expect(isVisible).toBe(false);
    });

    test("should become visible when comments dropdown is open", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      await expect
        .poll(() => reactGrab.isToolbarCopyAllVisible(), { timeout: 2000 })
        .toBe(true);
    });

    test("should hide when comments dropdown is closed", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();

      await expect
        .poll(() => reactGrab.isToolbarCopyAllVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickCommentsButton();

      await expect
        .poll(() => reactGrab.isToolbarCopyAllVisible(), { timeout: 2000 })
        .toBe(false);
    });
  });

  test.describe("Copy Behavior", () => {
    test("should copy all comments items to clipboard", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));

      await reactGrab.clickCommentsButton();
      await reactGrab.clickToolbarCopyAll();

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toContain("[1]");
      expect(clipboardContent).toContain("[2]");
    });

    test("should show clear comments prompt after copying", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();
      await reactGrab.clickToolbarCopyAll();

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(true);
    });
  });
});

test.describe("Clear History Prompt", () => {
  test.describe("Appearance", () => {
    test("should appear after toolbar copy all", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();
      await reactGrab.clickToolbarCopyAll();

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(true);
    });

    test("should appear after comments dropdown copy all", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await reactGrab.clickCommentsButton();
      await reactGrab.clickCommentsCopyAll();

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(true);
    });
  });

  test.describe("Confirm", () => {
    test("should clear comments when confirmed via button click", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickCommentsButton();
      await reactGrab.clickToolbarCopyAll();

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.confirmClearCommentsPrompt();
      await reactGrab.page.waitForTimeout(200);

      await expect
        .poll(() => reactGrab.isCommentsButtonVisible(), { timeout: 2000 })
        .toBe(false);
    });

    test("should clear comments when confirmed via Enter key", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickCommentsButton();
      await reactGrab.clickToolbarCopyAll();

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.pressEnter();
      await reactGrab.page.waitForTimeout(200);

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(false);

      await expect
        .poll(() => reactGrab.isCommentsButtonVisible(), { timeout: 2000 })
        .toBe(false);
    });

    test("should dismiss the prompt after confirming", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickCommentsButton();
      await reactGrab.clickToolbarCopyAll();

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.confirmClearCommentsPrompt();

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(false);
    });

    test("should skip prompt on subsequent copy-all after confirming once", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickCommentsButton();
      await reactGrab.clickToolbarCopyAll();

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.confirmClearCommentsPrompt();

      await expect
        .poll(() => reactGrab.isCommentsButtonVisible(), { timeout: 2000 })
        .toBe(false);

      await copyElement(reactGrab, "li:last-child");

      await reactGrab.clickCommentsButton();
      await reactGrab.clickToolbarCopyAll();

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(false);

      await expect
        .poll(() => reactGrab.isCommentsButtonVisible(), { timeout: 2000 })
        .toBe(false);
    });
  });

  test.describe("Cancel", () => {
    test("should keep comments when cancelled via button click", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickCommentsButton();
      await reactGrab.clickToolbarCopyAll();

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.cancelClearCommentsPrompt();
      await reactGrab.page.waitForTimeout(200);

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(false);

      await expect
        .poll(() => reactGrab.isCommentsButtonVisible(), { timeout: 2000 })
        .toBe(true);
    });

    test("should dismiss prompt when cancelled via Escape key", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickCommentsButton();
      await reactGrab.clickToolbarCopyAll();

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(200);

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(false);

      await expect
        .poll(() => reactGrab.isCommentsButtonVisible(), { timeout: 2000 })
        .toBe(true);
    });
  });

  test.describe("Dismiss Interactions", () => {
    test("should dismiss when opening context menu", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickCommentsButton();
      await reactGrab.clickToolbarCopyAll();

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(false);
    });

    test("should dismiss when toolbar is disabled", async ({ reactGrab }) => {
      await copyElement(reactGrab, "li:first-child");

      await reactGrab.clickCommentsButton();
      await reactGrab.clickToolbarCopyAll();

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickToolbarEnabled();
      await reactGrab.page.waitForTimeout(200);

      await expect
        .poll(() => reactGrab.isClearCommentsPromptVisible(), { timeout: 2000 })
        .toBe(false);
    });
  });
});
