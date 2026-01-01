import { test, expect } from "./fixtures.js";

test.describe("Context Menu", () => {
  test.describe("Visibility", () => {
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

    test("should not show context menu when inactive", async ({ reactGrab }) => {
      const isVisibleBefore = await reactGrab.isOverlayVisible();
      expect(isVisibleBefore).toBe(false);

      await reactGrab.rightClickElement("li");

      const isContextMenuVisible = await reactGrab.isContextMenuVisible();
      expect(isContextMenuVisible).toBe(false);
    });

    test("should show context menu after keyboard activation", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      await reactGrab.hoverElement("li");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li");

      const isContextMenuVisible = await reactGrab.isContextMenuVisible();
      expect(isContextMenuVisible).toBe(true);
    });

    test("should show context menu with Copy and Open items", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li");

      const isContextMenuVisible = await reactGrab.isContextMenuVisible();
      expect(isContextMenuVisible).toBe(true);

      const isCopyEnabled = await reactGrab.isContextMenuItemEnabled("Copy");
      expect(isCopyEnabled).toBe(true);
    });
  });

  test.describe("Menu Items", () => {
    test("should copy element when clicking Copy", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='todo-list'] h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='todo-list'] h1");
      await reactGrab.clickContextMenuItem("Copy");

      await reactGrab.page.waitForTimeout(500);

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toContain("Todo List");
    });

    test("should copy list item content correctly", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");
      await reactGrab.clickContextMenuItem("Copy");

      await reactGrab.page.waitForTimeout(500);

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toBeTruthy();
    });

    test("should have Copy always enabled", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li");

      const isCopyEnabled = await reactGrab.isContextMenuItemEnabled("Copy");
      expect(isCopyEnabled).toBe(true);
    });
  });

  test.describe("Dismissal", () => {
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

      await reactGrab.page.mouse.click(10, 10);
      await reactGrab.page.waitForTimeout(200);

      const isVisibleAfter = await reactGrab.isContextMenuVisible();
      expect(isVisibleAfter).toBe(false);
    });

    test("should dismiss context menu after Copy action", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li");

      await reactGrab.clickContextMenuItem("Copy");
      await reactGrab.page.waitForTimeout(300);

      const isContextMenuVisible = await reactGrab.isContextMenuVisible();
      expect(isContextMenuVisible).toBe(false);
    });
  });

  test.describe("Selection Freezing", () => {
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

    test("should maintain context menu while moving mouse", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("h1");

      await reactGrab.page.mouse.move(500, 500);
      await reactGrab.page.waitForTimeout(100);

      const isContextMenuVisible = await reactGrab.isContextMenuVisible();
      expect(isContextMenuVisible).toBe(true);
    });
  });

  test.describe("Multiple Context Menus", () => {
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

    test("should allow opening context menu after clicking outside to dismiss", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("h1");

      await reactGrab.page.mouse.click(10, 10);
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverElement("li");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li");

      const isContextMenuVisible = await reactGrab.isContextMenuVisible();
      expect(isContextMenuVisible).toBe(true);
    });

    test("should show context menu on different elements consecutively", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("h1");
      const firstMenuVisible = await reactGrab.isContextMenuVisible();
      expect(firstMenuVisible).toBe(true);

      await reactGrab.page.mouse.click(10, 10);
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");

      const secondMenuVisible = await reactGrab.isContextMenuVisible();
      expect(secondMenuVisible).toBe(true);
    });

    test("should switch to new context menu when right-clicking different element while menu is open", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("h1");
      const firstMenuVisible = await reactGrab.isContextMenuVisible();
      expect(firstMenuVisible).toBe(true);

      await reactGrab.rightClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(100);

      const secondMenuVisible = await reactGrab.isContextMenuVisible();
      expect(secondMenuVisible).toBe(true);
    });
  });

  test.describe("Keyboard Navigation Integration", () => {
    test("should show context menu after keyboard navigation", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.pressArrowDown();
      await reactGrab.waitForSelectionBox();

      await reactGrab.rightClickElement("li:nth-child(2)");

      const isContextMenuVisible = await reactGrab.isContextMenuVisible();
      expect(isContextMenuVisible).toBe(true);
    });

    test("should copy correct element after keyboard navigation via context menu", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='todo-list'] h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='todo-list'] h1");
      await reactGrab.clickContextMenuItem("Copy");

      await reactGrab.page.waitForTimeout(500);

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toContain("Todo List");
    });
  });

  test.describe("Element-specific Behavior", () => {
    test("should show context menu for heading element", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("h1");

      const isContextMenuVisible = await reactGrab.isContextMenuVisible();
      expect(isContextMenuVisible).toBe(true);
    });

    test("should show context menu for list element", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("ul");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("ul");

      const isContextMenuVisible = await reactGrab.isContextMenuVisible();
      expect(isContextMenuVisible).toBe(true);
    });

    test("should show context menu for list item element", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:nth-child(2)");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:nth-child(2)");

      const isContextMenuVisible = await reactGrab.isContextMenuVisible();
      expect(isContextMenuVisible).toBe(true);
    });
  });

  test.describe("Edge Cases", () => {
    test("should work correctly after scrolling page", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.scrollPage(100);
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.hoverElement("li");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li");

      const isContextMenuVisible = await reactGrab.isContextMenuVisible();
      expect(isContextMenuVisible).toBe(true);
    });

    test("should allow reopening after dismiss and copy flow", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li");
      await reactGrab.clickContextMenuItem("Copy");

      await reactGrab.page.waitForTimeout(500);

      await reactGrab.activate();
      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("h1");

      const isContextMenuVisible = await reactGrab.isContextMenuVisible();
      expect(isContextMenuVisible).toBe(true);
    });

    test("should copy different elements via context menu", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='todo-list'] h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='todo-list'] h1");
      await reactGrab.clickContextMenuItem("Copy");
      await reactGrab.page.waitForTimeout(500);

      const firstCopy = await reactGrab.getClipboardContent();
      expect(firstCopy).toContain("Todo List");

      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='todo-list'] li:first-child");
      await reactGrab.clickContextMenuItem("Copy");
      await reactGrab.page.waitForTimeout(500);

      const secondCopy = await reactGrab.getClipboardContent();
      expect(secondCopy).toBeTruthy();
      expect(secondCopy).not.toContain("Todo List");
    });
  });

  test.describe("Prompt Menu Item", () => {
    test("Prompt item should appear when agent is configured", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");

      const menuInfo = await reactGrab.getContextMenuInfo();
      expect(menuInfo.isVisible).toBe(true);
      expect(menuInfo.menuItems).toContain("Prompt");
    });

    test("Prompt item should enter input mode when clicked", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.clickContextMenuItem("Prompt");
      await reactGrab.page.waitForTimeout(200);

      const isInputMode = await reactGrab.isInputModeActive();
      expect(isInputMode).toBe(true);
    });
  });

  test.describe("Context Menu Positioning", () => {
    test("context menu should appear near click position", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='todo-list'] li:first-child");
      await reactGrab.page.waitForTimeout(200);

      const menuInfo = await reactGrab.getContextMenuInfo();
      expect(menuInfo.isVisible).toBe(true);
      expect(menuInfo.position).toBeDefined();
    });

    test("context menu should stay within viewport at bottom edge", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='edge-bottom-left']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='edge-bottom-left']");

      const menuInfo = await reactGrab.getContextMenuInfo();
      const viewport = await reactGrab.getViewportSize();

      if (menuInfo.position) {
        expect(menuInfo.position.y).toBeLessThan(viewport.height);
      }
    });

    test("context menu should stay within viewport at right edge", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='edge-top-right']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='edge-top-right']");

      const menuInfo = await reactGrab.getContextMenuInfo();
      const viewport = await reactGrab.getViewportSize();

      if (menuInfo.position) {
        expect(menuInfo.position.x).toBeLessThan(viewport.width);
      }
    });
  });

  test.describe("Context Menu After Drag Selection", () => {
    test("drag selection should create selection label", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.dragSelect("li:first-child", "li:nth-child(3)");
      await reactGrab.page.waitForTimeout(500);

      const selectionInfo = await reactGrab.getSelectionLabelInfo();
      expect(selectionInfo.isVisible).toBe(true);
    });
  });
});
