import { test, expect } from "./fixtures.js";

test.describe("Toolbar Menu", () => {
  test.describe("Open and Close", () => {
    test("right-clicking select button should open the menu", async ({ reactGrab }) => {
      await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);

      await reactGrab.rightClickToolbarToggle();

      await expect.poll(() => reactGrab.isToolbarMenuVisible(), { timeout: 2000 }).toBe(true);
    });

    test("pressing Escape should close the menu", async ({ reactGrab }) => {
      await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);

      await reactGrab.rightClickToolbarToggle();
      await expect.poll(() => reactGrab.isToolbarMenuVisible(), { timeout: 2000 }).toBe(true);

      await reactGrab.pressEscape();

      await expect.poll(() => reactGrab.isToolbarMenuVisible(), { timeout: 2000 }).toBe(false);
    });
  });

  test.describe("Menu Items", () => {
    test("menu should display registered actions", async ({ reactGrab }) => {
      await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);

      await reactGrab.rightClickToolbarToggle();

      await expect.poll(() => reactGrab.isToolbarMenuVisible(), { timeout: 2000 }).toBe(true);

      const actionIds = await reactGrab.page
        .locator("[data-react-grab-toolbar-menu] [data-react-grab-menu-item]")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-react-grab-menu-item")),
        );
      expect(actionIds).toEqual(["copy", "comment"]);
    });

    test("clicking a menu item should close the menu", async ({ reactGrab }) => {
      await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);

      await reactGrab.rightClickToolbarToggle();
      await expect.poll(() => reactGrab.isToolbarMenuVisible(), { timeout: 2000 }).toBe(true);

      const labels = await reactGrab.getToolbarMenuItemLabels();
      expect(labels.length).toBeGreaterThan(0);

      await reactGrab.clickToolbarMenuItem("comment");

      await expect.poll(() => reactGrab.isToolbarMenuVisible(), { timeout: 2000 }).toBe(false);
    });

    test("preserves a registered persisted default action", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        localStorage.setItem(
          "react-grab-toolbar-state",
          JSON.stringify({
            edge: "bottom",
            ratio: 0.5,
            collapsed: false,
            enabled: true,
            defaultAction: "comment",
          }),
        );
      });
      await reactGrab.page.reload();

      await expect
        .poll(() =>
          reactGrab.page.evaluate(() => window.__REACT_GRAB__?.getToolbarState()?.defaultAction),
        )
        .toBe("comment");
    });

    test("normalizes an unregistered persisted default action", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        localStorage.setItem(
          "react-grab-toolbar-state",
          JSON.stringify({
            edge: "bottom",
            ratio: 0.5,
            collapsed: false,
            enabled: true,
            defaultAction: "removed-action",
          }),
        );
      });
      await reactGrab.page.reload();

      const defaultAction = () =>
        reactGrab.page.evaluate(() => {
          const apiDefaultAction = window.__REACT_GRAB__?.getToolbarState()?.defaultAction;
          const persistedState = JSON.parse(
            localStorage.getItem("react-grab-toolbar-state") ?? "null",
          );
          return { apiDefaultAction, persistedDefaultAction: persistedState?.defaultAction };
        });
      await expect.poll(defaultAction).toEqual({
        apiDefaultAction: "copy",
        persistedDefaultAction: "copy",
      });
    });
  });

  test.describe("Interaction with Other Dropdowns", () => {
    test("opening context menu should dismiss toolbar menu", async ({ reactGrab }) => {
      await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);

      await reactGrab.rightClickToolbarToggle();
      await expect.poll(() => reactGrab.isToolbarMenuVisible(), { timeout: 2000 }).toBe(true);

      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("li:first-child");
      await reactGrab.rightClickElement("li:first-child");

      await expect.poll(() => reactGrab.isToolbarMenuVisible(), { timeout: 2000 }).toBe(false);
    });
  });
});
