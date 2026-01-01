import { test, expect } from "./fixtures.js";

test.describe("Context Menu", () => {
  test("should show context menu on right-click while active", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li");
    await reactGrab.waitForSelectionBox();
    await reactGrab.rightClickElement("li");

    const isContextMenuVisible = await reactGrab.isContextMenuVisible();
    expect(isContextMenuVisible).toBe(true);
  });

  test("should copy element when clicking Copy in context menu", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("h1");
    await reactGrab.waitForSelectionBox();
    await reactGrab.rightClickElement("h1");
    await reactGrab.clickContextMenuItem("Copy");

    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("Todo List");
  });

  test("should dismiss context menu on Escape", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li");
    await reactGrab.waitForSelectionBox();
    await reactGrab.rightClickElement("li");

    const isVisibleBefore = await reactGrab.isContextMenuVisible();
    expect(isVisibleBefore).toBe(true);

    await reactGrab.page.keyboard.press("Escape");
    await reactGrab.page.waitForTimeout(200);

    const isVisibleAfter = await reactGrab.isContextMenuVisible();
    expect(isVisibleAfter).toBe(false);
  });

  test("should dismiss context menu when clicking outside", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li");
    await reactGrab.waitForSelectionBox();
    await reactGrab.rightClickElement("li");

    const isVisibleBefore = await reactGrab.isContextMenuVisible();
    expect(isVisibleBefore).toBe(true);

    await reactGrab.page.mouse.click(300, 300);
    await reactGrab.page.waitForTimeout(200);

    const isVisibleAfter = await reactGrab.isContextMenuVisible();
    expect(isVisibleAfter).toBe(false);
  });

  test("should allow opening new context menu after using previous one", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("h1");
    await reactGrab.waitForSelectionBox();
    await reactGrab.rightClickElement("h1");
    await reactGrab.clickContextMenuItem("Copy");

    await reactGrab.page.waitForTimeout(300);

    await reactGrab.activate();
    await reactGrab.hoverElement("li");
    await reactGrab.waitForSelectionBox();
    await reactGrab.rightClickElement("li");

    const isContextMenuVisible = await reactGrab.isContextMenuVisible();
    expect(isContextMenuVisible).toBe(true);
  });

  test("should not show context menu when inactive", async ({ reactGrab }) => {
    const isVisibleBefore = await reactGrab.isOverlayVisible();
    expect(isVisibleBefore).toBe(false);

    await reactGrab.rightClickElement("li");

    const isContextMenuVisible = await reactGrab.isContextMenuVisible();
    expect(isContextMenuVisible).toBe(false);
  });

  test("should freeze element selection while context menu is open", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("h1");
    await reactGrab.waitForSelectionBox();
    await reactGrab.rightClickElement("h1");

    const isContextMenuVisible = await reactGrab.isContextMenuVisible();
    expect(isContextMenuVisible).toBe(true);

    await reactGrab.page.mouse.move(100, 100);
    await reactGrab.page.waitForTimeout(100);

    const stillVisible = await reactGrab.isContextMenuVisible();
    expect(stillVisible).toBe(true);
  });
});
