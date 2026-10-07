import { test, expect, type ReactGrabPageObject } from "./fixtures.js";

const BUTTON_SELECTOR = "button";

const waitForToolbar = async (reactGrab: ReactGrabPageObject) => {
  await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
};

test.describe("Toolbar Action Buttons", () => {
  test.describe("Layout", () => {
    test("renders only the copy button, unpressed initially", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);

      const actionIds = await reactGrab.page
        .locator("[data-react-grab-toolbar-action]")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-react-grab-toolbar-action")),
        );
      expect(actionIds).toEqual(["copy"]);
      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(false);
    });

    test("represents the selected default action with the single button", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.page.evaluate(() => {
        window.__REACT_GRAB__?.setToolbarState({ defaultAction: "comment" });
      });

      await expect
        .poll(() => reactGrab.getToolbarActionPressed("comment"), { timeout: 2000 })
        .toBe(false);
      await expect(
        reactGrab.page.locator('[data-react-grab-toolbar-action="comment"]'),
      ).toHaveAttribute("aria-label", "Comment element");

      await reactGrab.clickToolbarAction("comment");

      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(true);
      await reactGrab.hoverUntilSelected(BUTTON_SELECTOR);
      await reactGrab.clickElement(BUTTON_SELECTOR);
      await expect.poll(() => reactGrab.isPromptModeActive(), { timeout: 2000 }).toBe(true);
    });
  });

  test.describe("Active-state attribution", () => {
    test("clicking Copy marks it as pressed", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.clickToolbarAction("copy");

      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(true);
    });

    test("activating via API (no toolbar button) marks Copy as pressed", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.activate();

      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(true);
    });

    test("switches from API activation to the selected Comment default", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.page.evaluate(() => {
        window.__REACT_GRAB__?.setToolbarState({ defaultAction: "comment" });
      });
      await reactGrab.activate();

      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(false);
      await reactGrab.clickToolbarAction("comment");
      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(true);

      await reactGrab.hoverUntilSelected(BUTTON_SELECTOR);
      await reactGrab.clickElement(BUTTON_SELECTOR);
      await expect.poll(() => reactGrab.isPromptModeActive(), { timeout: 2000 }).toBe(true);
    });

    test("updates the armed action when the default changes", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.clickToolbarAction("copy");
      await reactGrab.rightClickToolbarToggle();
      await reactGrab.clickToolbarMenuItem("comment");

      expect(await reactGrab.getToolbarActionPressed("comment")).toBe(true);
      await reactGrab.hoverUntilSelected(BUTTON_SELECTOR);
      await reactGrab.clickElement(BUTTON_SELECTOR);
      await expect.poll(() => reactGrab.isPromptModeActive(), { timeout: 2000 }).toBe(true);
    });

    test("Escape resets the Copy button to unpressed", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.clickToolbarAction("copy");
      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(true);

      await reactGrab.deactivate();

      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(false);
    });

    test("context menu Comment leaves the Copy button unpressed", async ({ reactGrab }) => {
      await waitForToolbar(reactGrab);
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected(BUTTON_SELECTOR);
      await reactGrab.rightClickElement(BUTTON_SELECTOR);
      await reactGrab.clickContextMenuItem("Comment");

      await expect.poll(() => reactGrab.isPromptModeActive(), { timeout: 2000 }).toBe(true);
      expect(await reactGrab.getToolbarActionPressed("copy")).toBe(false);
    });
  });
});
