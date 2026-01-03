import { test, expect } from "./fixtures.js";

test.describe("Theme Customization", () => {
  test.describe("Hue Rotation", () => {
    test("should apply hue rotation filter", async ({ reactGrab }) => {
      await reactGrab.updateOptions({ theme: { hue: 180 } });
      await reactGrab.activate();

      const hasFilter = await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return false;
        const root = shadowRoot.querySelector(`[${attrName}]`) as HTMLElement;
        return root?.style.filter?.includes("hue-rotate") ?? false;
      }, "data-react-grab");

      expect(hasFilter).toBe(true);
    });

    test("should apply correct hue rotation value", async ({ reactGrab }) => {
      await reactGrab.updateOptions({ theme: { hue: 90 } });
      await reactGrab.activate();

      const filterValue = await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return null;
        const root = shadowRoot.querySelector(`[${attrName}]`) as HTMLElement;
        return root?.style.filter;
      }, "data-react-grab");

      expect(filterValue).toContain("hue-rotate(90deg)");
    });

    test("should not apply filter when hue is 0", async ({ reactGrab }) => {
      await reactGrab.updateOptions({ theme: { hue: 0 } });
      await reactGrab.activate();

      const filterValue = await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return "";
        const root = shadowRoot.querySelector(`[${attrName}]`) as HTMLElement;
        return root?.style.filter ?? "";
      }, "data-react-grab");

      expect(filterValue).toBe("");
    });
  });

  test.describe("Selection Box", () => {
    test("should show selection box by default", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });

    test("should hide selection box when disabled", async ({ reactGrab }) => {
      await reactGrab.updateOptions({ theme: { selectionBox: { enabled: false } } });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      const bounds = await reactGrab.getSelectionBoxBounds();
      expect(bounds).toBeNull();
    });
  });

  test.describe("Drag Box", () => {
    test("should show drag box by default", async ({ reactGrab }) => {
      await reactGrab.activate();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 20, box.y - 20);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 150, box.y + 150, { steps: 10 });

      const dragBounds = await reactGrab.getDragBoxBounds();
      await reactGrab.page.mouse.up();

      expect(dragBounds).toBeDefined();
    });

    test("should hide drag box when disabled", async ({ reactGrab }) => {
      await reactGrab.updateOptions({ theme: { dragBox: { enabled: false } } });
      await reactGrab.activate();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 20, box.y - 20);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 150, box.y + 150, { steps: 10 });

      const dragBounds = await reactGrab.getDragBoxBounds();
      await reactGrab.page.mouse.up();

      expect(dragBounds).toBeNull();
    });
  });

  test.describe("Grabbed Boxes", () => {
    test("should show grabbed boxes by default", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      const info = await reactGrab.getGrabbedBoxInfo();
      expect(info.count).toBeGreaterThan(0);
    });

    test("should hide grabbed boxes when disabled", async ({ reactGrab }) => {
      await reactGrab.updateOptions({ theme: { grabbedBoxes: { enabled: false } } });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      const isVisible = await reactGrab.isGrabbedBoxVisible();
      expect(isVisible).toBe(false);
    });
  });

  test.describe("Element Label", () => {
    test("should show element label by default", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionLabelVisible();
      expect(isVisible).toBe(true);
    });

    test("should hide element label when disabled", async ({ reactGrab }) => {
      await reactGrab.updateOptions({ theme: { elementLabel: { enabled: false } } });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      const labelInfo = await reactGrab.getSelectionLabelInfo();
      expect(labelInfo.isVisible).toBe(false);
    });
  });

  test.describe("Crosshair", () => {
    test("should show crosshair by default", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.page.mouse.move(400, 400);
      await reactGrab.page.waitForTimeout(100);

      const isVisible = await reactGrab.isCrosshairVisible();
      expect(isVisible).toBe(true);
    });

    test("should hide crosshair when disabled", async ({ reactGrab }) => {
      await reactGrab.updateOptions({ theme: { crosshair: { enabled: false } } });
      await reactGrab.activate();
      await reactGrab.page.mouse.move(400, 400);
      await reactGrab.page.waitForTimeout(100);

      const isVisible = await reactGrab.isCrosshairVisible();
      expect(isVisible).toBe(false);
    });
  });

  test.describe("Toolbar", () => {
    test("should show toolbar by default", async ({ reactGrab }) => {
      await reactGrab.page.waitForTimeout(600);

      const isVisible = await reactGrab.isToolbarVisible();
      expect(isVisible).toBe(true);
    });

    test("should hide toolbar when disabled", async ({ reactGrab }) => {
      await reactGrab.updateOptions({ theme: { toolbar: { enabled: false } } });
      await reactGrab.page.waitForTimeout(600);

      const isVisible = await reactGrab.isToolbarVisible();
      expect(isVisible).toBe(false);
    });
  });

  test.describe("Global Enable/Disable", () => {
    test("should disable entire overlay when enabled is false", async ({
      reactGrab,
    }) => {
      await reactGrab.updateOptions({ theme: { enabled: false } });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      const isSelectionBoxVisible = await reactGrab.isSelectionBoxVisible();
      expect(isSelectionBoxVisible).toBe(false);
    });
  });

  test.describe("Multiple Feature Toggles", () => {
    test("should apply multiple theme settings", async ({ reactGrab }) => {
      await reactGrab.updateOptions({
        theme: {
          hue: 45,
          crosshair: { enabled: false },
          elementLabel: { enabled: false },
        },
      });

      await reactGrab.activate();
      await reactGrab.page.mouse.move(400, 400);
      await reactGrab.page.waitForTimeout(100);

      const hasFilter = await reactGrab.page.evaluate(() => {
        const host = document.querySelector("[data-react-grab]");
        const shadowRoot = host?.shadowRoot;
        const root = shadowRoot?.querySelector(
          "[data-react-grab]",
        ) as HTMLElement;
        return root?.style.filter?.includes("hue-rotate(45deg)") ?? false;
      });
      expect(hasFilter).toBe(true);

      const isCrosshairVisible = await reactGrab.isCrosshairVisible();
      expect(isCrosshairVisible).toBe(false);
    });

    test("should allow re-enabling disabled features", async ({
      reactGrab,
    }) => {
      await reactGrab.updateOptions({ theme: { crosshair: { enabled: false } } });
      await reactGrab.activate();

      const isDisabled = await reactGrab.isCrosshairVisible();
      expect(isDisabled).toBe(false);

      await reactGrab.updateOptions({ theme: { crosshair: { enabled: true } } });
      await reactGrab.page.mouse.move(400, 400);
      await reactGrab.page.waitForTimeout(100);

      const isEnabled = await reactGrab.isCrosshairVisible();
      expect(isEnabled).toBe(true);
    });
  });

  test.describe("Theme Persistence", () => {
    test("theme should persist across activation cycles", async ({
      reactGrab,
    }) => {
      await reactGrab.updateOptions({ theme: { hue: 120 } });

      await reactGrab.activate();
      await reactGrab.deactivate();
      await reactGrab.activate();

      const hasFilter = await reactGrab.page.evaluate(() => {
        const host = document.querySelector("[data-react-grab]");
        const shadowRoot = host?.shadowRoot;
        const root = shadowRoot?.querySelector(
          "[data-react-grab]",
        ) as HTMLElement;
        return root?.style.filter?.includes("hue-rotate(120deg)") ?? false;
      });
      expect(hasFilter).toBe(true);
    });

    test("theme updates should be immediate", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.page.mouse.move(400, 400);
      await reactGrab.page.waitForTimeout(100);

      const isVisibleBefore = await reactGrab.isCrosshairVisible();
      expect(isVisibleBefore).toBe(true);

      await reactGrab.updateOptions({ theme: { crosshair: { enabled: false } } });

      const isVisibleAfter = await reactGrab.isCrosshairVisible();
      expect(isVisibleAfter).toBe(false);
    });
  });
});
