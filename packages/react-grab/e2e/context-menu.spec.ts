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

    test("should not show context menu when inactive", async ({
      reactGrab,
    }) => {
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

      const isOpenEnabled = await reactGrab.isContextMenuItemEnabled("Open");
      expect(isOpenEnabled).toBe(true);
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
      await reactGrab.page.waitForTimeout(300);

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");

      await expect
        .poll(async () => reactGrab.isSelectionBoxVisible(), { timeout: 5000 })
        .toBe(true);

      await reactGrab.rightClickElement("li:first-child");

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

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");

      const secondMenuVisible = await reactGrab.isContextMenuVisible();
      expect(secondMenuVisible).toBe(true);
    });

    test("should keep context menu on original element when right-clicking different element while menu is open", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("h1");
      const firstMenuVisible = await reactGrab.isContextMenuVisible();
      expect(firstMenuVisible).toBe(true);

      // Right-clicking elsewhere while menu is open should NOT switch to new element
      await reactGrab.rightClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(100);

      const menuStillVisible = await reactGrab.isContextMenuVisible();
      expect(menuStillVisible).toBe(true);
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
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.pressArrowDown();
      await reactGrab.waitForSelectionBox();

      await reactGrab.rightClickElement("li:nth-child(2)");
      await reactGrab.clickContextMenuItem("Copy");

      await reactGrab.page.waitForTimeout(500);

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toContain("Walk the dog");
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
    test("should work correctly after scrolling page", async ({
      reactGrab,
    }) => {
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
      await reactGrab.page.waitForTimeout(1600);

      const firstCopy = await reactGrab.getClipboardContent();
      expect(firstCopy).toContain("Todo List");

      await reactGrab.activate();
      await reactGrab.page.waitForTimeout(100);
      await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement(
        "[data-testid='todo-list'] li:first-child",
      );
      await reactGrab.clickContextMenuItem("Copy");
      await reactGrab.page.waitForTimeout(500);

      const secondCopy = await reactGrab.getClipboardContent();
      expect(secondCopy).toBeTruthy();
      expect(secondCopy).not.toContain("Todo List");
    });
  });

  test.describe("Prompt Menu Item", () => {
    test("Edit item should appear when agent is configured", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");

      const menuInfo = await reactGrab.getContextMenuInfo();
      expect(menuInfo.isVisible).toBe(true);
      expect(menuInfo.menuItems).toContain("Edit");
    });

    test("Edit item should enter input mode when clicked", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.clickContextMenuItem("Edit");
      await reactGrab.page.waitForTimeout(200);

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(true);
    });
  });

  test.describe("Context Menu Positioning", () => {
    test("context menu should appear near click position", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='todo-list'] li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement(
        "[data-testid='todo-list'] li:first-child",
      );
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

  test.describe("Custom Actions with Agent", () => {
    test("custom action with agent should appear in menu", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              unregisterPlugin: (name: string) => void;
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;

        const mockProvider = {
          async *send() {
            yield "Processing...";
            yield "Completed";
          },
          supportsFollowUp: true,
        };

        api?.unregisterPlugin("custom-agent-action");
        const agent = { provider: mockProvider };
        api?.registerPlugin({
          name: "custom-agent-action",
          actions: [
            {
              id: "custom-edit",
              label: "Custom Edit",
              shortcut: "E",
              onAction: (context: {
                enterPromptMode?: (agent?: Record<string, unknown>) => void;
              }) => {
                context.enterPromptMode?.(agent);
              },
              agent,
            },
          ],
        });
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");

      const menuInfo = await reactGrab.getContextMenuInfo();
      expect(menuInfo.isVisible).toBe(true);
      expect(
        menuInfo.menuItems.map((item: string) => item.toLowerCase()),
      ).toContain("custom edit");
    });

    test("custom action should trigger enterPromptMode", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              unregisterPlugin: (name: string) => void;
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;

        const mockProvider = {
          async *send() {
            yield "Processing...";
            yield "Completed";
          },
          supportsFollowUp: true,
        };

        api?.unregisterPlugin("custom-agent-action");
        const agent = { provider: mockProvider };
        api?.registerPlugin({
          name: "custom-agent-action",
          actions: [
            {
              id: "custom-edit",
              label: "Custom Edit",
              shortcut: "E",
              onAction: (context: {
                enterPromptMode?: (agent?: Record<string, unknown>) => void;
              }) => {
                context.enterPromptMode?.(agent);
              },
              agent,
            },
          ],
        });
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.clickContextMenuItem("Custom edit");
      await reactGrab.page.waitForTimeout(200);

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(true);
    });

    test("action without agent should just execute onAction", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              unregisterPlugin: (name: string) => void;
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;

        api?.unregisterPlugin("plain-action");
        api?.registerPlugin({
          name: "plain-action",
          actions: [
            {
              id: "plain-action",
              label: "Plain Action",
              onAction: () => {
                (
                  window as { __plainActionCalled?: boolean }
                ).__plainActionCalled = true;
              },
            },
          ],
        });
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");

      const menuInfo = await reactGrab.getContextMenuInfo();
      const lowerMenuItems = menuInfo.menuItems.map((item: string) =>
        item.toLowerCase(),
      );
      expect(lowerMenuItems).toContain("plain action");

      await reactGrab.clickContextMenuItem("Plain Action");
      await reactGrab.page.waitForTimeout(100);

      const actionCalled = await reactGrab.page.evaluate(
        () =>
          (window as { __plainActionCalled?: boolean }).__plainActionCalled ??
          false,
      );
      expect(actionCalled).toBe(true);
    });

    test("multiple actions should all appear in menu", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              unregisterPlugin: (name: string) => void;
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;

        api?.unregisterPlugin("multi-actions");
        api?.registerPlugin({
          name: "multi-actions",
          actions: [
            {
              id: "action-1",
              label: "First Action",
              onAction: () => {},
            },
            {
              id: "action-2",
              label: "Second Action",
              onAction: () => {},
            },
          ],
        });
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");

      const menuInfo = await reactGrab.getContextMenuInfo();
      const lowerMenuItems = menuInfo.menuItems.map((item: string) =>
        item.toLowerCase(),
      );
      expect(lowerMenuItems).toContain("first action");
      expect(lowerMenuItems).toContain("second action");
    });

    test("action with shortcut should be triggerable via keyboard", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              unregisterPlugin: (name: string) => void;
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;

        api?.unregisterPlugin("keyboard-action");
        api?.registerPlugin({
          name: "keyboard-action",
          actions: [
            {
              id: "keyboard-action",
              label: "Keyboard Action",
              shortcut: "K",
              onAction: () => {
                (
                  window as { __keyboardActionCalled?: boolean }
                ).__keyboardActionCalled = true;
              },
            },
          ],
        });
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.pressModifierKeyCombo("k");
      await reactGrab.page.waitForTimeout(200);

      const actionCalled = await reactGrab.page.evaluate(
        () =>
          (window as { __keyboardActionCalled?: boolean })
            .__keyboardActionCalled ?? false,
      );
      expect(actionCalled).toBe(true);
    });

    test("disabled action should appear but be disabled", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              unregisterPlugin: (name: string) => void;
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;

        api?.unregisterPlugin("disabled-action");
        api?.registerPlugin({
          name: "disabled-action",
          actions: [
            {
              id: "disabled-action",
              label: "Disabled Action",
              enabled: false,
              onAction: () => {},
            },
          ],
        });
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");

      const isDisabled = await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return false;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        const button = root?.querySelector(
          '[data-react-grab-menu-item="disabled action"]',
        );
        return button?.hasAttribute("disabled") ?? false;
      }, "data-react-grab");
      expect(isDisabled).toBe(true);
    });

    test("action enabled function should receive context", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              unregisterPlugin: (name: string) => void;
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;

        api?.unregisterPlugin("context-action");
        api?.registerPlugin({
          name: "context-action",
          actions: [
            {
              id: "context-action",
              label: "Context Action",
              enabled: (context: { element: Element }) => {
                (window as { __enabledTagName?: string }).__enabledTagName =
                  context.element.tagName;
                return context.element.tagName.toLowerCase() === "li";
              },
              onAction: () => {},
            },
          ],
        });
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");

      const enabledTagName = await reactGrab.page.evaluate(
        () => (window as { __enabledTagName?: string }).__enabledTagName,
      );
      expect(enabledTagName).toBe("LI");

      const menuInfo = await reactGrab.getContextMenuInfo();
      const lowerMenuItems = menuInfo.menuItems.map((item: string) =>
        item.toLowerCase(),
      );
      expect(lowerMenuItems).toContain("context action");
    });
  });
});
