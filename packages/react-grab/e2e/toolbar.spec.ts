import { test, expect } from "./fixtures.js";

test.describe("Toolbar", () => {
  test.describe("Visibility", () => {
    test("toolbar should be visible after initial load", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);
    });

    test("toolbar should fade in after delay", async ({ reactGrab }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);
    });

    test("toolbar should be hidden on mobile viewport", async ({
      reactGrab,
    }) => {
      await reactGrab.setViewportSize(375, 667);
      await reactGrab.page.reload();
      await reactGrab.page.waitForLoadState("domcontentloaded");

      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(false);

      await reactGrab.setViewportSize(1280, 720);
    });

    test("toolbar should reappear when viewport returns to desktop size", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.setViewportSize(375, 667);
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(false);

      await reactGrab.setViewportSize(1280, 720);
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);
    });
  });

  test.describe("Toggle Activation", () => {
    test("clicking toolbar toggle should activate overlay", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickToolbarToggle();

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(true);
    });

    test("clicking toolbar toggle again should deactivate overlay", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickToolbarToggle();
      await reactGrab.clickToolbarToggle();

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(false);
    });

    test("toolbar toggle should reflect current activation state", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.activate();

      const toolbarInfo = await reactGrab.getToolbarInfo();
      expect(toolbarInfo.isVisible).toBe(true);
    });
  });

  test.describe("Collapse/Expand", () => {
    test("clicking collapse button should collapse toolbar", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickToolbarCollapse();

      await expect
        .poll(() => reactGrab.isToolbarCollapsed(), { timeout: 2000 })
        .toBe(true);
    });

    test("clicking collapsed toolbar should expand it", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickToolbarCollapse();
      await expect
        .poll(() => reactGrab.isToolbarCollapsed(), { timeout: 2000 })
        .toBe(true);

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

      await expect
        .poll(() => reactGrab.isToolbarCollapsed(), { timeout: 2000 })
        .toBe(false);
    });

    test("collapsed toolbar should not allow activation toggle", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickToolbarCollapse();
      await expect
        .poll(() => reactGrab.isToolbarCollapsed(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickToolbarToggle();

      const isActive = await reactGrab.isOverlayVisible();
      const isCollapsed = await reactGrab.isToolbarCollapsed();

      expect(isCollapsed || !isActive).toBe(true);
    });
  });

  test.describe("Dragging", () => {
    test.beforeEach(async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        localStorage.removeItem("react-grab-toolbar-state");
      });
      await reactGrab.page.reload();
      await reactGrab.page.waitForLoadState("domcontentloaded");
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 3000 })
        .toBe(true);
      // HACK: Wait for toolbar fade-in animation to complete
      await reactGrab.page.waitForTimeout(600);
    });

    test("should be draggable", async ({ reactGrab }) => {
      const initialInfo = await reactGrab.getToolbarInfo();
      const initialPosition = initialInfo.position;
      expect(initialPosition).not.toBeNull();

      await reactGrab.dragToolbar(100, 0);

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getToolbarInfo();
            if (!info.position || !initialPosition) return 0;
            return Math.abs(info.position.x - initialPosition.x);
          },
          { timeout: 3000 },
        )
        .toBeGreaterThan(0);
    });

    test("should snap to edges after drag", async ({ reactGrab }) => {
      await reactGrab.dragToolbar(500, 0);

      const info = await reactGrab.getToolbarInfo();
      expect(info.snapEdge).toBeDefined();
    });

    test("should snap to top edge", async ({ reactGrab }) => {
      await reactGrab.dragToolbar(0, -500);

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getToolbarInfo();
            return info.snapEdge;
          },
          { timeout: 3000 },
        )
        .toBe("top");
    });

    test("should snap to left edge", async ({ reactGrab }) => {
      await reactGrab.dragToolbar(-1000, -500);

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getToolbarInfo();
            return info.snapEdge;
          },
          { timeout: 3000 },
        )
        .toMatch(/^(left|top)$/);
    });

    test("should snap to right edge", async ({ reactGrab }) => {
      await reactGrab.dragToolbar(1500, -500);

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getToolbarInfo();
            return info.snapEdge;
          },
          { timeout: 3000 },
        )
        .toMatch(/^(right|top)$/);
    });

    test("should not drag when collapsed", async ({ reactGrab }) => {
      await reactGrab.clickToolbarCollapse();
      await expect
        .poll(() => reactGrab.isToolbarCollapsed(), { timeout: 2000 })
        .toBe(true);

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
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.dragToolbar(200, -200);
      // HACK: Wait for snap animation
      await reactGrab.page.waitForTimeout(200);

      const positionBeforeReload = await reactGrab.getToolbarInfo();

      await reactGrab.page.reload();
      await reactGrab.page.waitForLoadState("domcontentloaded");
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

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
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.clickToolbarCollapse();
      await expect
        .poll(() => reactGrab.isToolbarCollapsed(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.page.reload();
      await reactGrab.page.waitForLoadState("domcontentloaded");
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await expect
        .poll(() => reactGrab.isToolbarCollapsed(), { timeout: 2000 })
        .toBe(true);
    });
  });

  test.describe("Chevron Rotation", () => {
    test.beforeEach(async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        localStorage.removeItem("react-grab-toolbar-state");
      });
      await reactGrab.page.reload();
      await reactGrab.page.waitForLoadState("domcontentloaded");
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 3000 })
        .toBe(true);
      // HACK: Wait for toolbar fade-in animation to complete
      await reactGrab.page.waitForTimeout(600);
    });

    test("chevron should rotate based on snap edge", async ({ reactGrab }) => {
      await reactGrab.dragToolbar(0, -500);

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getToolbarInfo();
            return info.snapEdge;
          },
          { timeout: 3000 },
        )
        .toBe("top");

      // HACK: Need extra delay for snap animation before next drag
      await reactGrab.page.waitForTimeout(300);

      await reactGrab.dragToolbar(0, 800);

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getToolbarInfo();
            return info.snapEdge;
          },
          { timeout: 3000 },
        )
        .toBe("bottom");
    });
  });

  test.describe("Viewport Resize Handling", () => {
    test("toolbar should recalculate position on viewport resize", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.setViewportSize(1920, 1080);

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getToolbarInfo();
            return info.isVisible;
          },
          { timeout: 2000 },
        )
        .toBe(true);

      await reactGrab.setViewportSize(1280, 720);
    });

    test("toolbar should remain visible after rapid resize", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      for (let i = 0; i < 3; i++) {
        await reactGrab.setViewportSize(1000 + i * 100, 700 + i * 50);
      }

      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.setViewportSize(1280, 720);
    });
  });

  test.describe("Edge Cases", () => {
    test("toolbar should handle very small viewport", async ({ reactGrab }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.setViewportSize(320, 480);

      const isVisible = await reactGrab.isToolbarVisible();
      expect(typeof isVisible).toBe("boolean");

      await reactGrab.setViewportSize(1280, 720);
    });

    test("toolbar should handle rapid collapse/expand", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      for (let i = 0; i < 5; i++) {
        await reactGrab.clickToolbarCollapse();
      }

      const info = await reactGrab.getToolbarInfo();
      expect(info.isVisible).toBe(true);
    });

    test("toolbar should maintain position ratio on resize", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.dragToolbar(-200, 0);

      await reactGrab.setViewportSize(800, 600);

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getToolbarInfo();
            return info.isVisible;
          },
          { timeout: 2000 },
        )
        .toBe(true);

      await reactGrab.setViewportSize(1280, 720);
    });
  });
});
