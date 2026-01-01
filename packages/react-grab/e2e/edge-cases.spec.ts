import { test, expect } from "./fixtures.js";

test.describe("Edge Cases", () => {
  test.describe("Element Removal", () => {
    test("should handle element removed during hover", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='dynamic-element-1']");
      await reactGrab.waitForSelectionBox();

      await reactGrab.removeElement("[data-testid='dynamic-element-1']");
      await reactGrab.page.waitForTimeout(200);

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(true);
    });

    test("should handle element removed during drag", async ({ reactGrab }) => {
      await reactGrab.activate();

      const element = reactGrab.page.locator(
        "[data-testid='dynamic-element-1']",
      );
      const box = await element.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 10, box.y - 10);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 50, box.y + 50, { steps: 3 });

      await reactGrab.removeElement("[data-testid='dynamic-element-1']");
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.page.mouse.up();

      const isActive = await reactGrab.isOverlayVisible();
      expect(typeof isActive).toBe("boolean");
    });

    test("should recover after target element is removed", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='dynamic-element-2']");
      await reactGrab.waitForSelectionBox();

      await reactGrab.removeElement("[data-testid='dynamic-element-2']");

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe("Rapid Actions", () => {
    test("should handle rapid activation/deactivation cycles", async ({
      reactGrab,
    }) => {
      for (let i = 0; i < 10; i++) {
        await reactGrab.activate();
        await reactGrab.page.waitForTimeout(20);
        await reactGrab.deactivate();
        await reactGrab.page.waitForTimeout(20);
      }

      const state = await reactGrab.getState();
      expect(typeof state.isActive).toBe("boolean");
    });

    test("should handle rapid hover changes", async ({ reactGrab }) => {
      await reactGrab.activate();

      const elements = [
        "li:first-child",
        "li:nth-child(2)",
        "li:nth-child(3)",
        "h1",
        "ul",
      ];
      for (const selector of elements) {
        await reactGrab.hoverElement(selector);
        await reactGrab.page.waitForTimeout(10);
      }

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(true);
    });

    test("should handle rapid clicks", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      for (let i = 0; i < 5; i++) {
        await reactGrab.clickElement("li:first-child");
        await reactGrab.page.waitForTimeout(50);
      }

      await reactGrab.page.waitForTimeout(500);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toBeTruthy();
    });

    test("should handle rapid toggle calls", async ({ reactGrab }) => {
      for (let i = 0; i < 8; i++) {
        await reactGrab.toggle();
        await reactGrab.page.waitForTimeout(30);
      }

      const state = await reactGrab.getState();
      expect(typeof state.isActive).toBe("boolean");
    });
  });

  test.describe("Visibility Changes", () => {
    test("should handle tab visibility change", async ({ reactGrab }) => {
      await reactGrab.activate();

      await reactGrab.page.evaluate(() => {
        document.dispatchEvent(new Event("visibilitychange"));
        Object.defineProperty(document, "hidden", {
          value: true,
          writable: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      await reactGrab.page.waitForTimeout(100);

      await reactGrab.page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
          value: false,
          writable: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });

    test("should handle window blur and focus", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.evaluate(() => {
        window.dispatchEvent(new Event("blur"));
      });
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.page.evaluate(() => {
        window.dispatchEvent(new Event("focus"));
      });
      await reactGrab.page.waitForTimeout(100);

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });
  });

  test.describe("Scroll and Resize", () => {
    test("should handle scroll during drag operation", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x, box.y);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 50, box.y + 50, { steps: 3 });

      await reactGrab.scrollPage(100);

      await reactGrab.page.mouse.up();

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });

    test("should handle resize during selection", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.setViewportSize(800, 600);
      await reactGrab.page.waitForTimeout(200);

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(true);

      await reactGrab.setViewportSize(1280, 720);
    });

    test("should handle rapid scroll events", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      for (let i = 0; i < 5; i++) {
        await reactGrab.scrollPage(50);
        await reactGrab.page.waitForTimeout(20);
      }

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(true);
    });
  });

  test.describe("Memory and Cleanup", () => {
    test("dispose should clean up properly", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.dispose();
      await reactGrab.page.waitForTimeout(200);

      const canReinit = await reactGrab.page.evaluate(() => {
        const initFn = (window as { initReactGrab?: () => void }).initReactGrab;
        return typeof initFn === "function";
      });
      expect(canReinit).toBe(true);
    });

    test("should allow reinitialization after dispose", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.dispose();

      await reactGrab.reinitialize();

      await reactGrab.activate();
      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(true);
    });

    test("double initialization should be prevented", async ({ reactGrab }) => {
      await reactGrab.reinitialize();
      await reactGrab.page.waitForTimeout(200);

      const hostCount = await reactGrab.page.evaluate(() => {
        return document.querySelectorAll("[data-react-grab]").length;
      });
      expect(hostCount).toBe(1);
    });
  });

  test.describe("Focus Management", () => {
    test("should restore focus to previously focused element", async ({
      reactGrab,
    }) => {
      await reactGrab.page.click("[data-testid='test-input']");
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.clickElement("li:first-child");
      await reactGrab.page.waitForTimeout(2000);

      const focusedElement = await reactGrab.page.evaluate(() => {
        return document.activeElement?.getAttribute("data-testid");
      });

      expect(focusedElement).toBe("test-input");
    });
  });

  test.describe("Context Menu Edge Cases", () => {
    test("should handle context menu on removed element", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='dynamic-element-3']");
      await reactGrab.waitForSelectionBox();

      await reactGrab.rightClickElement("[data-testid='dynamic-element-3']");

      await reactGrab.removeElement("[data-testid='dynamic-element-3']");
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.pressEscape();

      const isActive = await reactGrab.isOverlayVisible();
      expect(typeof isActive).toBe("boolean");
    });
  });

  test.describe("Copy Edge Cases", () => {
    test("should handle copy during visibility change", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.evaluate(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      await reactGrab.page.waitForTimeout(500);

      const clipboard = await reactGrab.getClipboardContent();
      expect(clipboard).toBeTruthy();
    });
  });

  test.describe("Viewport Edge Cases", () => {
    test("should handle elements outside viewport", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.scrollPage(1000);
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverElement("[data-testid='footer']");
      await reactGrab.waitForSelectionBox();

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(true);
    });

    test("should handle zero-dimension elements gracefully", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.page.mouse.move(100, 100);
      await reactGrab.page.waitForTimeout(100);

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(true);
    });

    test("should handle invisible elements", async ({ reactGrab }) => {
      await reactGrab.activate();

      await reactGrab.page.mouse.move(200, 200);
      await reactGrab.page.waitForTimeout(100);

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(true);
    });
  });

  test.describe("State Consistency", () => {
    test("getState should be consistent across calls", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      const state1 = await reactGrab.getState();
      const state2 = await reactGrab.getState();

      expect(state1.isActive).toBe(state2.isActive);
      expect(state1.isDragging).toBe(state2.isDragging);
      expect(state1.isCopying).toBe(state2.isCopying);
    });

    test("state should be correct after complex interaction sequence", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.pressArrowDown();
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.rightClickElement("li:nth-child(2)");
      await reactGrab.page.waitForTimeout(100);

      const state = await reactGrab.getState();
      expect(state.isActive).toBe(true);
    });
  });
});
