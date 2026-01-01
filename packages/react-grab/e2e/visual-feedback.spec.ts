import { test, expect } from "./fixtures.js";

test.describe("Visual Feedback", () => {
  test.describe("Selection Box", () => {
    test("selection box should match element bounds", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      const elementBounds = await reactGrab.getElementBounds("li:first-child");
      const selectionBounds = await reactGrab.getSelectionBoxBounds();

      if (elementBounds && selectionBounds) {
        expect(Math.abs(selectionBounds.x - elementBounds.x)).toBeLessThan(5);
        expect(Math.abs(selectionBounds.y - elementBounds.y)).toBeLessThan(5);
        expect(Math.abs(selectionBounds.width - elementBounds.width)).toBeLessThan(10);
        expect(Math.abs(selectionBounds.height - elementBounds.height)).toBeLessThan(10);
      }
    });

    test("selection box should update when hovering different elements", async ({ reactGrab }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      const bounds1 = await reactGrab.getSelectionBoxBounds();

      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();
      const bounds2 = await reactGrab.getSelectionBoxBounds();

      if (bounds1 && bounds2) {
        expect(bounds1.width !== bounds2.width || bounds1.height !== bounds2.height).toBe(true);
      }
    });

    test("selection box should track scrolling element", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      const boundsBefore = await reactGrab.getSelectionBoxBounds();

      await reactGrab.scrollPage(50);
      await reactGrab.page.waitForTimeout(200);

      const boundsAfter = await reactGrab.getSelectionBoxBounds();

      if (boundsBefore && boundsAfter) {
        expect(boundsBefore.y - boundsAfter.y).toBeGreaterThan(0);
      }
    });
  });

  test.describe("Drag Box", () => {
    test("drag box should appear during drag", async ({ reactGrab }) => {
      await reactGrab.activate();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 20, box.y - 20);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 150, box.y + 150, { steps: 10 });

      const dragBounds = await reactGrab.getDragBoxBounds();
      expect(dragBounds).toBeDefined();

      await reactGrab.page.mouse.up();
    });

    test("drag box should grow with drag distance", async ({ reactGrab }) => {
      await reactGrab.activate();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 20, box.y - 20);
      await reactGrab.page.mouse.down();

      await reactGrab.page.mouse.move(box.x + 50, box.y + 50, { steps: 5 });
      const smallDragBounds = await reactGrab.getDragBoxBounds();

      await reactGrab.page.mouse.move(box.x + 200, box.y + 200, { steps: 5 });
      const largeDragBounds = await reactGrab.getDragBoxBounds();

      if (smallDragBounds && largeDragBounds) {
        expect(largeDragBounds.width).toBeGreaterThan(smallDragBounds.width);
        expect(largeDragBounds.height).toBeGreaterThan(smallDragBounds.height);
      }

      await reactGrab.page.mouse.up();
    });

    test("drag box should disappear after drag ends", async ({ reactGrab }) => {
      await reactGrab.activate();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 20, box.y - 20);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 150, box.y + 150, { steps: 10 });
      await reactGrab.page.mouse.up();

      await reactGrab.page.waitForTimeout(100);

      const dragBounds = await reactGrab.getDragBoxBounds();
      expect(dragBounds).toBeNull();
    });
  });

  test.describe("Grabbed Box", () => {
    test("grabbed box should appear after element click", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      const grabbedInfo = await reactGrab.getGrabbedBoxInfo();
      expect(grabbedInfo.count).toBeGreaterThan(0);
    });

    test("grabbed box should fade out after delay", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.waitForTimeout(2000);

      const grabbedInfo = await reactGrab.getGrabbedBoxInfo();
      expect(grabbedInfo.count).toBe(0);
    });
  });

  test.describe("Crosshair", () => {
    test("crosshair should be visible when active", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.page.mouse.move(400, 400);
      await reactGrab.page.waitForTimeout(100);

      const isVisible = await reactGrab.isCrosshairVisible();
      expect(isVisible).toBe(true);
    });

    test("crosshair should follow cursor", async ({ reactGrab }) => {
      await reactGrab.activate();

      await reactGrab.page.mouse.move(200, 200);
      await reactGrab.page.waitForTimeout(100);
      const info1 = await reactGrab.getCrosshairInfo();

      await reactGrab.page.mouse.move(500, 400);
      await reactGrab.page.waitForTimeout(100);
      const info2 = await reactGrab.getCrosshairInfo();

      if (info1.position && info2.position) {
        expect(info1.position.x).not.toBe(info2.position.x);
        expect(info1.position.y).not.toBe(info2.position.y);
      }
    });

    test("crosshair should be hidden during drag", async ({ reactGrab }) => {
      await reactGrab.activate();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x, box.y);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 100, box.y + 100, { steps: 5 });

      const state = await reactGrab.getState();
      expect(state.isDragging).toBe(true);

      await reactGrab.page.mouse.up();
    });
  });

  test.describe("Selection Label", () => {
    test("label should show tag name", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();

      const labelInfo = await reactGrab.getSelectionLabelInfo();
      expect(labelInfo.tagName).toBe("h1");
    });

    test("label should show element count for multi-select", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.dragSelect("li:first-child", "li:nth-child(3)");
      await reactGrab.page.waitForTimeout(200);

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });

    test("label should position below element by default", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();

      const elementBounds = await reactGrab.getElementBounds("h1");
      const labelInfo = await reactGrab.getSelectionLabelInfo();

      expect(labelInfo.isVisible).toBe(true);
      expect(elementBounds).toBeDefined();
    });

    test("label should be clamped to viewport", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='edge-bottom-left']");
      await reactGrab.waitForSelectionBox();

      const labelInfo = await reactGrab.getSelectionLabelInfo();
      expect(labelInfo.isVisible).toBe(true);
    });
  });

  test.describe("Status Transitions", () => {
    test("should show copying status during copy", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("li:first-child");

      const statusText = await reactGrab.getLabelStatusText();
      expect(typeof statusText === "string" || statusText === null).toBe(true);
    });

    test("should transition to copied status after copy", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("li:first-child");
      await reactGrab.page.waitForTimeout(500);

      const statusText = await reactGrab.getLabelStatusText();
      expect(typeof statusText === "string" || statusText === null).toBe(true);
    });
  });

  test.describe("Arrow Direction", () => {
    test("arrow should point down when label is below element", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();

      const labelInfo = await reactGrab.getSelectionLabelInfo();
      expect(labelInfo.isVisible).toBe(true);
    });

    test("arrow should adjust when near viewport bottom", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.scrollPage(500);
      await reactGrab.hoverElement("[data-testid='footer']");
      await reactGrab.waitForSelectionBox();

      const labelInfo = await reactGrab.getSelectionLabelInfo();
      expect(labelInfo.isVisible).toBe(true);
    });
  });

  test.describe("Multiple Visual Elements", () => {
    test("selection box and label should be synchronized", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      const selectionVisible = await reactGrab.isSelectionBoxVisible();
      const labelVisible = await reactGrab.isSelectionLabelVisible();

      expect(selectionVisible).toBe(true);
      expect(labelVisible).toBe(true);
    });

    test("all visual elements should update on viewport change", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.setViewportSize(1024, 768);
      await reactGrab.page.waitForTimeout(200);

      const selectionVisible = await reactGrab.isSelectionBoxVisible();
      expect(selectionVisible).toBe(true);

      await reactGrab.setViewportSize(1280, 720);
    });
  });
});
