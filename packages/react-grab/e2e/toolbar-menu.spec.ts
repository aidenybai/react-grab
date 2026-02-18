import { test, expect } from "./fixtures.js";

test.describe("Toolbar Menu", () => {
  test.describe("Visibility", () => {
    test("menu button should be visible when toolbar actions are registered", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await expect
        .poll(() => reactGrab.isToolbarMenuButtonVisible(), { timeout: 2000 })
        .toBe(true);
    });

    test("menu dropdown should not be visible by default", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      const isMenuVisible = await reactGrab.isToolbarMenuVisible();
      expect(isMenuVisible).toBe(false);
    });

    test("menu button should be hidden when toolbar is disabled", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickToolbarEnabled();
      await reactGrab.page.waitForTimeout(200);

      const isMenuButtonVisible = await reactGrab.isToolbarMenuButtonVisible();
      expect(isMenuButtonVisible).toBe(false);
    });
  });

  test.describe("Open and Close", () => {
    test("clicking menu button should open the menu", async ({ reactGrab }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickToolbarMenuButton();

      const isMenuVisible = await reactGrab.isToolbarMenuVisible();
      expect(isMenuVisible).toBe(true);
    });

    test("clicking menu button again should close the menu", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickToolbarMenuButton();
      await reactGrab.clickToolbarMenuButton();

      const isMenuVisible = await reactGrab.isToolbarMenuVisible();
      expect(isMenuVisible).toBe(false);
    });

    test("pressing Escape should close the menu", async ({ reactGrab }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickToolbarMenuButton();
      await expect
        .poll(() => reactGrab.isToolbarMenuVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(200);

      const isMenuVisible = await reactGrab.isToolbarMenuVisible();
      expect(isMenuVisible).toBe(false);
    });
  });

  test.describe("Menu Items", () => {
    test("menu should display registered toolbar actions", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickToolbarMenuButton();

      const menuInfo = await reactGrab.getToolbarMenuInfo();
      expect(menuInfo.isVisible).toBe(true);
      expect(menuInfo.itemCount).toBeGreaterThan(0);
      expect(menuInfo.itemLabels.length).toBeGreaterThan(0);
    });
  });

  test.describe("Interaction with Other Dropdowns", () => {
    test("opening context menu should dismiss toolbar menu", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickToolbarMenuButton();
      await expect
        .poll(() => reactGrab.isToolbarMenuVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");

      await expect
        .poll(() => reactGrab.isToolbarMenuVisible(), { timeout: 2000 })
        .toBe(false);
    });

    test("opening toolbar menu should dismiss history dropdown", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("li:first-child");
      await reactGrab.page.waitForTimeout(300);

      await expect
        .poll(() => reactGrab.isHistoryButtonVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickHistoryButton();
      await expect
        .poll(() => reactGrab.isHistoryDropdownVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickToolbarMenuButton();

      await expect
        .poll(() => reactGrab.isHistoryDropdownVisible(), { timeout: 2000 })
        .toBe(false);
      await expect
        .poll(() => reactGrab.isToolbarMenuVisible(), { timeout: 2000 })
        .toBe(true);
    });
  });
});
