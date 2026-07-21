import { test, expect, type ReactGrabPageObject } from "./fixtures.js";

const LIST_ITEM_SELECTOR = "li:first-child";
const BUTTON_SELECTOR = "button";

const waitForToolbar = async (reactGrab: ReactGrabPageObject) => {
  await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
};

test.describe("Toolbar Action Buttons", () => {
  test.describe("Layout", () => {
    test("renders only copy and comment buttons, both unpressed initially", async ({
      reactGrab,
    }) => {
      await waitForToolbar(reactGrab);

      const actionIds = await reactGrab.page
        .locator("[data-react-grab-toolbar-action]")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-react-grab-toolbar-action")),
        );
      expect(actionIds).toEqual(["copy", "comment"]);
      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(false);
      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(false);
    });
  });

  test.describe("Active-state attribution", () => {
    test("clicking Comment marks only the Comment button as pressed", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.clickToolbarAction("comment");

      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(true);
      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(false);
    });

    test("clicking Copy marks only the Copy button as pressed", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.clickToolbarAction("copy");

      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(true);
      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(false);
    });

    test("activating via API (no toolbar button) marks Copy as pressed", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.activate();

      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(true);
      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(false);
    });

    test("clicking a different action while active switches without deactivating", async ({
      reactGrab,
    }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.clickToolbarAction("copy");
      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(true);

      await reactGrab.clickToolbarAction("comment");

      expect(await reactGrab.isOverlayVisible()).toBe(true);
      await expect
        .poll(() => reactGrab.getToolbarActionPressed("comment"), { timeout: 2000 })
        .toBe(true);
      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(false);
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
    });

    test("context menu Comment marks only the Comment button as pressed", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected(BUTTON_SELECTOR);
      await reactGrab.rightClickElement(BUTTON_SELECTOR);
      await reactGrab.clickContextMenuItem("Comment");

      await expect.poll(() => reactGrab.isPromptModeActive(), { timeout: 2000 }).toBe(true);
      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(true);
      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(false);
    });
  });

  test.describe("Mode activation", () => {
    test("Comment button selects an element into prompt mode", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.clickToolbarAction("comment");
      await reactGrab.hoverUntilSelected(LIST_ITEM_SELECTOR);
      await reactGrab.clickElement(LIST_ITEM_SELECTOR);

      await expect.poll(() => reactGrab.isPromptModeActive(), { timeout: 2000 }).toBe(true);
    });
  });
});
