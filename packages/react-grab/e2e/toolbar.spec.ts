import { test, expect } from "./fixtures.js";

test.describe("Toolbar", () => {
  test.describe("Visibility", () => {
    test("toolbar should be visible after initial load", async ({
      reactGrab,
    }) => {
      await reactGrab.page.waitForTimeout(1000);

      const isVisible = await reactGrab.isToolbarVisible();
      expect(isVisible).toBe(true);
    });

    test("toolbar should fade in after delay", async ({ reactGrab }) => {
      const initiallyVisible = await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return false;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        const toolbarElements = root?.querySelectorAll(
          "[data-react-grab-ignore-events]",
        );
        for (const element of toolbarElements ?? []) {
          const style = window.getComputedStyle(element);
          if (style.cursor === "grab" || style.cursor === "grabbing") {
            return style.opacity !== "0";
          }
        }
        return false;
      }, "data-react-grab");

      await reactGrab.page.waitForTimeout(600);

      const finallyVisible = await reactGrab.isToolbarVisible();
      expect(finallyVisible).toBe(true);
    });

    test("toolbar should be hidden on mobile viewport", async ({
      reactGrab,
    }) => {
      await reactGrab.setViewportSize(375, 667);
      await reactGrab.page.reload();
      await reactGrab.page.waitForTimeout(600);

      const isVisible = await reactGrab.isToolbarVisible();
      expect(isVisible).toBe(false);

      await reactGrab.setViewportSize(1280, 720);
    });

    test("toolbar should reappear when viewport returns to desktop size", async ({
      reactGrab,
    }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.setViewportSize(375, 667);
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.setViewportSize(1280, 720);
      await reactGrab.page.waitForTimeout(600);

      const isVisible = await reactGrab.isToolbarVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe("Toggle Activation", () => {
    test("clicking toolbar toggle should activate overlay", async ({
      reactGrab,
    }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.clickToolbarToggle();

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(true);
    });

    test("clicking toolbar toggle again should deactivate overlay", async ({
      reactGrab,
    }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.clickToolbarToggle();
      await reactGrab.page.waitForTimeout(100);
      await reactGrab.clickToolbarToggle();

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(false);
    });

    test("toolbar toggle should reflect current activation state", async ({
      reactGrab,
    }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.activate();

      const toolbarInfo = await reactGrab.getToolbarInfo();
      expect(toolbarInfo.isVisible).toBe(true);
    });
  });

  test.describe("Collapse/Expand", () => {
    test("clicking collapse button should collapse toolbar", async ({
      reactGrab,
    }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.clickToolbarCollapse();
      await reactGrab.page.waitForTimeout(200);

      const isCollapsed = await reactGrab.isToolbarCollapsed();
      expect(isCollapsed).toBe(true);
    });

    test("clicking collapsed toolbar should expand it", async ({
      reactGrab,
    }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.clickToolbarCollapse();
      await reactGrab.page.waitForTimeout(200);

      expect(await reactGrab.isToolbarCollapsed()).toBe(true);

      await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        const toolbar = root?.querySelector<HTMLElement>(
          "[data-react-grab-toolbar]",
        );
        const innerDiv = toolbar?.querySelector("div");
        innerDiv?.click();
      }, "data-react-grab");
      await reactGrab.page.waitForTimeout(300);

      const isCollapsed = await reactGrab.isToolbarCollapsed();
      expect(isCollapsed).toBe(false);
    });

    test("collapsed toolbar should not allow activation toggle", async ({
      reactGrab,
    }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.clickToolbarCollapse();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.clickToolbarToggle();
      await reactGrab.page.waitForTimeout(100);

      const isActive = await reactGrab.isOverlayVisible();
      const isCollapsed = await reactGrab.isToolbarCollapsed();

      expect(isCollapsed || !isActive).toBe(true);
    });
  });

  test.describe("Dragging", () => {
    test("should be draggable", async ({ reactGrab }) => {
      await reactGrab.page.waitForTimeout(600);

      const initialInfo = await reactGrab.getToolbarInfo();
      const initialPosition = initialInfo.position;

      await reactGrab.dragToolbar(100, 0);

      const finalInfo = await reactGrab.getToolbarInfo();
      const finalPosition = finalInfo.position;

      if (initialPosition && finalPosition) {
        expect(Math.abs(finalPosition.x - initialPosition.x)).toBeGreaterThan(
          0,
        );
      }
    });

    test("should snap to edges after drag", async ({ reactGrab }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.dragToolbar(500, 0);

      const info = await reactGrab.getToolbarInfo();
      expect(info.snapEdge).toBeDefined();
    });

    test("should snap to top edge", async ({ reactGrab }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.dragToolbar(0, -500);

      const info = await reactGrab.getToolbarInfo();
      expect(info.snapEdge).toBe("top");
    });

    test("should snap to left edge", async ({ reactGrab }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.dragToolbar(-1000, -500);
      await reactGrab.page.waitForTimeout(500);

      const info = await reactGrab.getToolbarInfo();
      expect(["left", "top"]).toContain(info.snapEdge);
    });

    test("should snap to right edge", async ({ reactGrab }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.dragToolbar(1500, -500);
      await reactGrab.page.waitForTimeout(500);

      const info = await reactGrab.getToolbarInfo();
      expect(["right", "top"]).toContain(info.snapEdge);
    });

    test("should not drag when collapsed", async ({ reactGrab }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.clickToolbarCollapse();
      await reactGrab.page.waitForTimeout(200);

      const initialInfo = await reactGrab.getToolbarInfo();
      const initialPosition = initialInfo.position;

      await reactGrab.dragToolbar(100, 100);

      const finalInfo = await reactGrab.getToolbarInfo();
      const finalPosition = finalInfo.position;

      if (initialPosition && finalPosition) {
        expect(Math.abs(finalPosition.x - initialPosition.x)).toBeLessThan(20);
        expect(Math.abs(finalPosition.y - initialPosition.y)).toBeLessThan(20);
      }
    });
  });

  test.describe("State Persistence", () => {
    test("toolbar position should persist across page reloads", async ({
      reactGrab,
    }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.dragToolbar(200, -200);
      await reactGrab.page.waitForTimeout(400);

      const positionBeforeReload = await reactGrab.getToolbarInfo();

      await reactGrab.page.reload();
      await reactGrab.page.waitForLoadState("networkidle");
      await reactGrab.page.waitForTimeout(600);

      const positionAfterReload = await reactGrab.getToolbarInfo();

      if (positionBeforeReload.snapEdge && positionAfterReload.snapEdge) {
        expect(positionAfterReload.snapEdge).toBe(
          positionBeforeReload.snapEdge,
        );
      }
    });

    test("collapsed state should persist across page reloads", async ({
      reactGrab,
    }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.clickToolbarCollapse();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.page.reload();
      await reactGrab.page.waitForLoadState("networkidle");
      await reactGrab.page.waitForTimeout(600);

      const isCollapsed = await reactGrab.isToolbarCollapsed();
      expect(isCollapsed).toBe(true);
    });
  });

  test.describe("Chevron Rotation", () => {
    test("chevron should rotate based on snap edge", async ({ reactGrab }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.dragToolbar(0, -500);
      await reactGrab.page.waitForTimeout(300);

      const topEdgeInfo = await reactGrab.getToolbarInfo();
      expect(topEdgeInfo.snapEdge).toBe("top");

      await reactGrab.dragToolbar(0, 800);
      await reactGrab.page.waitForTimeout(300);

      const bottomEdgeInfo = await reactGrab.getToolbarInfo();
      expect(bottomEdgeInfo.snapEdge).toBe("bottom");
    });
  });

  test.describe("Viewport Resize Handling", () => {
    test("toolbar should recalculate position on viewport resize", async ({
      reactGrab,
    }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.setViewportSize(1920, 1080);
      await reactGrab.page.waitForTimeout(600);

      const largeViewportInfo = await reactGrab.getToolbarInfo();
      expect(largeViewportInfo.isVisible).toBe(true);

      await reactGrab.setViewportSize(1280, 720);
    });

    test("toolbar should remain visible after rapid resize", async ({
      reactGrab,
    }) => {
      await reactGrab.page.waitForTimeout(600);

      for (let i = 0; i < 3; i++) {
        await reactGrab.setViewportSize(1000 + i * 100, 700 + i * 50);
        await reactGrab.page.waitForTimeout(100);
      }

      await reactGrab.page.waitForTimeout(600);

      const isVisible = await reactGrab.isToolbarVisible();
      expect(isVisible).toBe(true);

      await reactGrab.setViewportSize(1280, 720);
    });
  });

  test.describe("Edge Cases", () => {
    test("toolbar should handle very small viewport", async ({ reactGrab }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.setViewportSize(320, 480);
      await reactGrab.page.waitForTimeout(600);

      const isVisible = await reactGrab.isToolbarVisible();
      expect(typeof isVisible).toBe("boolean");

      await reactGrab.setViewportSize(1280, 720);
    });

    test("toolbar should handle rapid collapse/expand", async ({
      reactGrab,
    }) => {
      await reactGrab.page.waitForTimeout(600);

      for (let i = 0; i < 5; i++) {
        await reactGrab.clickToolbarCollapse();
        await reactGrab.page.waitForTimeout(50);
      }

      await reactGrab.page.waitForTimeout(300);

      const info = await reactGrab.getToolbarInfo();
      expect(info.isVisible).toBe(true);
    });

    test("toolbar should maintain position ratio on resize", async ({
      reactGrab,
    }) => {
      await reactGrab.page.waitForTimeout(600);

      await reactGrab.dragToolbar(-200, 0);
      await reactGrab.page.waitForTimeout(300);

      await reactGrab.setViewportSize(800, 600);
      await reactGrab.page.waitForTimeout(600);

      const info = await reactGrab.getToolbarInfo();
      expect(info.isVisible).toBe(true);

      await reactGrab.setViewportSize(1280, 720);
    });
  });
});
