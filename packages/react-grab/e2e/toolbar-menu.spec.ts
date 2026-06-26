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

      const labels = await reactGrab.getToolbarMenuItemLabels();
      expect(labels.length).toBeGreaterThan(0);
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
