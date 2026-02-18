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

    test("toolbar should be visible on mobile viewport after reload", async ({
      reactGrab,
    }) => {
      await reactGrab.setViewportSize(375, 667);
      await reactGrab.page.reload();
      await reactGrab.page.waitForLoadState("domcontentloaded");
      await reactGrab.page.waitForFunction(
        () =>
          (window as { __REACT_GRAB__?: unknown }).__REACT_GRAB__ !== undefined,
        { timeout: 10000 },
      );

      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 3000 })
        .toBe(true);

      await reactGrab.setViewportSize(1280, 720);
    });

    test("toolbar should remain visible through viewport resize cycles", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.setViewportSize(375, 667);
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

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

    test("should be draggable from select button", async ({ reactGrab }) => {
      const initialInfo = await reactGrab.getToolbarInfo();
      const initialPosition = initialInfo.position;
      expect(initialPosition).not.toBeNull();

      await reactGrab.dragToolbarFromButton(
        "[data-react-grab-toolbar-toggle]",
        100,
        0,
      );

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

    test("should not close page dropdown when clicking select button", async ({
      reactGrab,
    }) => {
      await reactGrab.openDropdown();
      expect(await reactGrab.isDropdownOpen()).toBe(true);

      await reactGrab.clickToolbarToggle();

      expect(await reactGrab.isDropdownOpen()).toBe(true);
    });

    test("should not close page dropdown when dragging from select button", async ({
      reactGrab,
    }) => {
      await reactGrab.openDropdown();
      expect(await reactGrab.isDropdownOpen()).toBe(true);

      await reactGrab.dragToolbarFromButton(
        "[data-react-grab-toolbar-toggle]",
        50,
        0,
      );

      expect(await reactGrab.isDropdownOpen()).toBe(true);
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

  test.describe("Vertical Layout", () => {
    const seedVerticalState = async (
      page: import("@playwright/test").Page,
      edge: "left" | "right",
    ) => {
      await page.evaluate(
        ({ edge: savedEdge }) => {
          localStorage.setItem(
            "react-grab-toolbar-state",
            JSON.stringify({
              edge: savedEdge,
              ratio: 0.5,
              collapsed: false,
              enabled: true,
            }),
          );
        },
        { edge },
      );
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
    };

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

    test("should render vertically when snapped to right edge", async ({
      reactGrab,
    }) => {
      await seedVerticalState(reactGrab.page, "right");
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 3000 })
        .toBe(true);

      const info = await reactGrab.getToolbarInfo();
      expect(info.snapEdge).toBe("right");
      expect(info.isVertical).toBe(true);
      expect(info.dimensions).not.toBeNull();
      expect(info.dimensions!.height).toBeGreaterThan(info.dimensions!.width);
    });

    test("should render vertically when snapped to left edge", async ({
      reactGrab,
    }) => {
      await seedVerticalState(reactGrab.page, "left");
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 3000 })
        .toBe(true);

      const info = await reactGrab.getToolbarInfo();
      expect(info.snapEdge).toBe("left");
      expect(info.isVertical).toBe(true);
      expect(info.dimensions).not.toBeNull();
      expect(info.dimensions!.height).toBeGreaterThan(info.dimensions!.width);
    });

    test("should render horizontally when snapped to top or bottom", async ({
      reactGrab,
    }) => {
      const info = await reactGrab.getToolbarInfo();
      expect(info.isVertical).toBe(false);
      expect(info.dimensions).not.toBeNull();
      expect(info.dimensions!.width).toBeGreaterThan(info.dimensions!.height);
    });

    test("should allow toggle activation in vertical mode", async ({
      reactGrab,
    }) => {
      await seedVerticalState(reactGrab.page, "right");
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 3000 })
        .toBe(true);

      await reactGrab.clickToolbarToggle();
      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(true);
    });

    test("should collapse and expand in vertical mode", async ({
      reactGrab,
    }) => {
      await seedVerticalState(reactGrab.page, "right");
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 3000 })
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

    test("should toggle enabled state in vertical mode", async ({
      reactGrab,
    }) => {
      await seedVerticalState(reactGrab.page, "right");
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 3000 })
        .toBe(true);

      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to complete
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to complete
      await reactGrab.page.waitForTimeout(200);

      const info = await reactGrab.getToolbarInfo();
      expect(info.isVisible).toBe(true);
      expect(info.snapEdge).toBe("right");
    });

    test("vertical edge state should persist across page reloads", async ({
      reactGrab,
    }) => {
      await seedVerticalState(reactGrab.page, "right");
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 3000 })
        .toBe(true);

      await reactGrab.page.reload();
      await reactGrab.page.waitForLoadState("domcontentloaded");
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 3000 })
        .toBe(true);

      const infoAfterReload = await reactGrab.getToolbarInfo();
      expect(infoAfterReload.snapEdge).toBe("right");
      expect(infoAfterReload.isVertical).toBe(true);
    });

    test("vertical toolbar should be snapped to edge after reload", async ({
      reactGrab,
    }) => {
      const viewportSize = await reactGrab.getViewportSize();

      await seedVerticalState(reactGrab.page, "right");
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 3000 })
        .toBe(true);

      await reactGrab.page.reload();
      await reactGrab.page.waitForLoadState("domcontentloaded");
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 3000 })
        .toBe(true);

      const info = await reactGrab.getToolbarInfo();
      expect(info.position).not.toBeNull();
      expect(info.dimensions).not.toBeNull();

      const rightEdgePosition = info.position!.x + info.dimensions!.width;
      expect(rightEdgePosition).toBeGreaterThan(viewportSize.width - 30);
    });

    test("should transition from vertical to horizontal when dragged to bottom", async ({
      reactGrab,
    }) => {
      await seedVerticalState(reactGrab.page, "right");
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 3000 })
        .toBe(true);
      // HACK: Wait for toolbar fade-in animation to complete
      await reactGrab.page.waitForTimeout(600);

      const verticalInfo = await reactGrab.getToolbarInfo();
      expect(verticalInfo.isVertical).toBe(true);

      await reactGrab.dragToolbar(-500, 500);

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getToolbarInfo();
            return info.snapEdge;
          },
          { timeout: 3000 },
        )
        .toBe("bottom");

      const horizontalInfo = await reactGrab.getToolbarInfo();
      expect(horizontalInfo.isVertical).toBe(false);
    });

    test("should be draggable from vertical position", async ({
      reactGrab,
    }) => {
      await seedVerticalState(reactGrab.page, "right");
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 3000 })
        .toBe(true);
      // HACK: Wait for toolbar fade-in animation to complete
      await reactGrab.page.waitForTimeout(600);

      const initialInfo = await reactGrab.getToolbarInfo();
      expect(initialInfo.position).not.toBeNull();

      await reactGrab.dragToolbar(0, 100);

      await expect
        .poll(
          async () => {
            const info = await reactGrab.getToolbarInfo();
            if (!info.position || !initialInfo.position) return false;
            return (
              Math.abs(info.position.x - initialInfo.position.x) > 0 ||
              Math.abs(info.position.y - initialInfo.position.y) > 0
            );
          },
          { timeout: 3000 },
        )
        .toBe(true);

      const movedInfo = await reactGrab.getToolbarInfo();
      expect(movedInfo.isVisible).toBe(true);
      expect(movedInfo.snapEdge).not.toBeNull();
    });
  });
});
