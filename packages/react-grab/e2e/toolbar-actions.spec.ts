import { test, expect, type ReactGrabPageObject } from "./fixtures.js";
import { isEditPanelVisible, BUTTON_SELECTOR } from "./edit-panel-helpers.js";

const LIST_ITEM_SELECTOR = "li:first-child";

const waitForToolbar = async (reactGrab: ReactGrabPageObject) => {
  await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
};

test.describe("Toolbar Action Buttons", () => {
  test.describe("Layout", () => {
    test("renders copy, comment, and style buttons, all unpressed initially", async ({
      reactGrab,
    }) => {
      await waitForToolbar(reactGrab);

      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(false);
      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(false);
      expect(await reactGrab.getToolbarActionPressed("edit")).toBe(false);
    });
  });

  test.describe("Active-state attribution", () => {
    test("clicking Comment marks only the Comment button as pressed", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.clickToolbarAction("comment");

      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(true);
      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(false);
      expect(await reactGrab.getToolbarActionPressed("edit")).toBe(false);
    });

    test("clicking Style marks only the Style button as pressed", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.clickToolbarAction("edit");

      expect(await reactGrab.getToolbarActionPressed("edit")).toBe(true);
      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(false);
      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(false);
    });

    test("clicking Copy marks only the Copy button as pressed", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.clickToolbarAction("copy");

      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(true);
      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(false);
      expect(await reactGrab.getToolbarActionPressed("edit")).toBe(false);
    });

    test("activating via API (no toolbar button) marks Copy as pressed", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.activate();

      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(true);
      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(false);
      expect(await reactGrab.getToolbarActionPressed("edit")).toBe(false);
    });

    test("clicking a different action while active switches without deactivating", async ({
      reactGrab,
    }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.clickToolbarAction("copy");
      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(true);

      await reactGrab.clickToolbarAction("comment");

      expect(await reactGrab.isOverlayVisible()).toBe(true);
      await expect.poll(() => reactGrab.getToolbarActionPressed("comment"), { timeout: 2000 }).toBe(true);
      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(false);
      expect(await reactGrab.getToolbarActionPressed("edit")).toBe(false);
    });

    test("clicking the already-active action toggles selection off", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.clickToolbarAction("comment");
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.clickToolbarAction("comment");

      await expect.poll(() => reactGrab.isOverlayVisible(), { timeout: 2000 }).toBe(false);
      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(false);
    });

    test("Escape resets every action button to unpressed", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.clickToolbarAction("comment");
      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(true);

      await reactGrab.deactivate();

      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(false);
      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(false);
      expect(await reactGrab.getToolbarActionPressed("edit")).toBe(false);
    });
  });

  test.describe("Mode activation", () => {
    test("Comment button selects an element into prompt mode", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.clickToolbarAction("comment");
      await reactGrab.hoverElement(LIST_ITEM_SELECTOR);
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement(LIST_ITEM_SELECTOR);

      await expect.poll(() => reactGrab.isPromptModeActive(), { timeout: 2000 }).toBe(true);
    });

    test("Style button selects an element into the style panel", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.clickToolbarAction("edit");
      await reactGrab.hoverElement(BUTTON_SELECTOR);
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement(BUTTON_SELECTOR);

      await expect.poll(() => isEditPanelVisible(reactGrab.page), { timeout: 2000 }).toBe(true);
    });
  });
});
