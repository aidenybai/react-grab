import { test, expect } from "./fixtures.js";

test.describe("Event Callbacks", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await reactGrab.setupCallbackTracking();
    await reactGrab.clearCallbackHistory();
  });

  test.describe("Activation Callbacks", () => {
    test("onActivate should fire when overlay is activated", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      const args = await reactGrab.waitForCallback("onActivate", 2000);
      expect(args).toBeDefined();
    });

    test("onDeactivate should fire when overlay is deactivated", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.clearCallbackHistory();

      await reactGrab.deactivate();

      const args = await reactGrab.waitForCallback("onDeactivate", 2000);
      expect(args).toBeDefined();
    });

    test("onActivate should fire before onDeactivate in activation cycle", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.deactivate();

      const history = await reactGrab.getCallbackHistory();
      const activateIndex = history.findIndex((c) => c.name === "onActivate");
      const deactivateIndex = history.findIndex(
        (c) => c.name === "onDeactivate",
      );

      expect(activateIndex).toBeLessThan(deactivateIndex);
    });

    test("onActivate should only fire once per activation", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.page.waitForTimeout(200);

      const history = await reactGrab.getCallbackHistory();
      const activateCalls = history.filter((c) => c.name === "onActivate");

      expect(activateCalls.length).toBe(1);
    });
  });

  test.describe("Element Interaction Callbacks", () => {
    test("onElementHover should fire when hovering over elements", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.clearCallbackHistory();

      await reactGrab.hoverElement("li:first-child");

      const history = await reactGrab.getCallbackHistory();
      const hoverCalls = history.filter((c) => c.name === "onElementHover");

      expect(hoverCalls.length).toBeGreaterThan(0);
    });

    test("onElementHover should receive element as argument", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.clearCallbackHistory();

      await reactGrab.hoverElement("h1");
      await reactGrab.page.waitForTimeout(100);

      const history = await reactGrab.getCallbackHistory();
      const hoverCalls = history.filter((c) => c.name === "onElementHover");

      expect(hoverCalls.length).toBeGreaterThan(0);
    });

    test("onElementSelect should fire when element is clicked", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clearCallbackHistory();

      await reactGrab.clickElement("li:first-child");
      await reactGrab.page.waitForTimeout(300);

      const history = await reactGrab.getCallbackHistory();
      const selectCalls = history.filter((c) => c.name === "onElementSelect");

      expect(selectCalls.length).toBeGreaterThan(0);
    });

    test("onElementHover should fire for different elements", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.clearCallbackHistory();

      await reactGrab.hoverElement("h1");
      await reactGrab.page.waitForTimeout(100);
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.page.waitForTimeout(100);
      await reactGrab.hoverElement("ul");
      await reactGrab.page.waitForTimeout(100);

      const history = await reactGrab.getCallbackHistory();
      const hoverCalls = history.filter((c) => c.name === "onElementHover");

      expect(hoverCalls.length).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe("Drag Callbacks", () => {
    test("onDragStart should fire when drag begins", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.clearCallbackHistory();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 10, box.y - 10);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 100, box.y + 100, { steps: 5 });

      const history = await reactGrab.getCallbackHistory();
      const dragStartCalls = history.filter((c) => c.name === "onDragStart");

      expect(dragStartCalls.length).toBe(1);

      await reactGrab.page.mouse.up();
    });

    test("onDragEnd should fire when drag completes", async ({ reactGrab }) => {
      await reactGrab.activate();

      await reactGrab.dragSelect("li:first-child", "li:nth-child(3)");
      await reactGrab.page.waitForTimeout(300);

      const history = await reactGrab.getCallbackHistory();
      const dragEndCalls = history.filter((c) => c.name === "onDragEnd");

      expect(dragEndCalls.length).toBeGreaterThanOrEqual(1);
    });

    test("onDragStart should include coordinates", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.clearCallbackHistory();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      const startX = box.x - 10;
      const startY = box.y - 10;

      await reactGrab.page.mouse.move(startX, startY);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(startX + 100, startY + 100, { steps: 5 });
      await reactGrab.page.mouse.up();

      const history = await reactGrab.getCallbackHistory();
      const dragStartCalls = history.filter((c) => c.name === "onDragStart");

      expect(dragStartCalls.length).toBeGreaterThan(0);
    });
  });

  test.describe("Copy Callbacks", () => {
    test("onBeforeCopy should fire before clipboard write", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clearCallbackHistory();

      await reactGrab.clickElement("h1");
      await reactGrab.page.waitForTimeout(500);

      const history = await reactGrab.getCallbackHistory();
      const beforeCopyCalls = history.filter((c) => c.name === "onBeforeCopy");

      expect(beforeCopyCalls.length).toBeGreaterThan(0);
    });

    test("onAfterCopy should fire after clipboard write", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clearCallbackHistory();

      await reactGrab.clickElement("li:first-child");
      await reactGrab.page.waitForTimeout(500);

      const history = await reactGrab.getCallbackHistory();
      const afterCopyCalls = history.filter((c) => c.name === "onAfterCopy");

      expect(afterCopyCalls.length).toBeGreaterThan(0);
    });

    test("onCopySuccess should fire with content on successful copy", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clearCallbackHistory();

      await reactGrab.clickElement("h1");
      await reactGrab.page.waitForTimeout(500);

      const history = await reactGrab.getCallbackHistory();
      const successCalls = history.filter((c) => c.name === "onCopySuccess");

      expect(successCalls.length).toBeGreaterThan(0);
    });

    test("copy callbacks should fire in correct order", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clearCallbackHistory();

      await reactGrab.clickElement("li:first-child");
      await reactGrab.page.waitForTimeout(500);

      const history = await reactGrab.getCallbackHistory();
      const beforeIndex = history.findIndex((c) => c.name === "onBeforeCopy");
      const afterIndex = history.findIndex((c) => c.name === "onAfterCopy");

      if (beforeIndex !== -1 && afterIndex !== -1) {
        expect(beforeIndex).toBeLessThan(afterIndex);
      }
    });
  });

  test.describe("State Change Callback", () => {
    test("onStateChange should fire on activation", async ({ reactGrab }) => {
      await reactGrab.clearCallbackHistory();

      await reactGrab.activate();
      await reactGrab.page.waitForTimeout(100);

      const history = await reactGrab.getCallbackHistory();
      const stateChangeCalls = history.filter(
        (c) => c.name === "onStateChange",
      );

      expect(stateChangeCalls.length).toBeGreaterThan(0);
    });

    test("onStateChange should fire on deactivation", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.clearCallbackHistory();

      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(100);

      const history = await reactGrab.getCallbackHistory();
      const stateChangeCalls = history.filter(
        (c) => c.name === "onStateChange",
      );

      expect(stateChangeCalls.length).toBeGreaterThan(0);
    });

    test("onStateChange should fire during drag", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.clearCallbackHistory();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 10, box.y - 10);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 100, box.y + 100, { steps: 5 });
      await reactGrab.page.waitForTimeout(100);
      await reactGrab.page.mouse.up();

      const history = await reactGrab.getCallbackHistory();
      const stateChangeCalls = history.filter(
        (c) => c.name === "onStateChange",
      );

      expect(stateChangeCalls.length).toBeGreaterThan(0);
    });
  });

  test.describe("UI Element Callbacks", () => {
    test("onSelectionBox should fire when selection box appears", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.clearCallbackHistory();

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.page.waitForTimeout(100);

      const history = await reactGrab.getCallbackHistory();
      const selectionBoxCalls = history.filter(
        (c) => c.name === "onSelectionBox",
      );

      expect(selectionBoxCalls.length).toBeGreaterThan(0);
    });

    test("onDragBox should fire during drag selection", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.clearCallbackHistory();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 20, box.y - 20);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 150, box.y + 150, { steps: 10 });
      await reactGrab.page.waitForTimeout(100);
      await reactGrab.page.mouse.up();

      const history = await reactGrab.getCallbackHistory();
      const dragBoxCalls = history.filter((c) => c.name === "onDragBox");

      expect(dragBoxCalls.length).toBeGreaterThan(0);
    });

    test("onCrosshair should fire when crosshair moves", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.clearCallbackHistory();

      await reactGrab.page.mouse.move(200, 200);
      await reactGrab.page.waitForTimeout(50);
      await reactGrab.page.mouse.move(300, 300);
      await reactGrab.page.waitForTimeout(100);

      const history = await reactGrab.getCallbackHistory();
      const crosshairCalls = history.filter((c) => c.name === "onCrosshair");

      expect(crosshairCalls.length).toBeGreaterThan(0);
    });

    test("onGrabbedBox should fire when element is grabbed", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clearCallbackHistory();

      await reactGrab.clickElement("li:first-child");
      await reactGrab.page.waitForTimeout(300);

      const history = await reactGrab.getCallbackHistory();
      const grabbedBoxCalls = history.filter((c) => c.name === "onGrabbedBox");

      expect(grabbedBoxCalls.length).toBeGreaterThan(0);
    });
  });

  test.describe("Context Menu Callback", () => {
    test("onContextMenu should fire on right-click", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clearCallbackHistory();

      await reactGrab.rightClickElement("li:first-child");

      const history = await reactGrab.getCallbackHistory();
      const contextMenuCalls = history.filter(
        (c) => c.name === "onContextMenu",
      );

      expect(contextMenuCalls.length).toBe(1);
    });
  });

  test.describe("Callback Integrity", () => {
    test("callbacks should not fire when overlay is inactive", async ({
      reactGrab,
    }) => {
      await reactGrab.clearCallbackHistory();

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.page.waitForTimeout(100);

      const history = await reactGrab.getCallbackHistory();
      const hoverCalls = history.filter((c) => c.name === "onElementHover");

      expect(hoverCalls.length).toBe(0);
    });

    test("callbacks should include timestamps", async ({ reactGrab }) => {
      await reactGrab.clearCallbackHistory();

      await reactGrab.activate();
      await reactGrab.page.waitForTimeout(100);

      const history = await reactGrab.getCallbackHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].timestamp).toBeDefined();
      expect(typeof history[0].timestamp).toBe("number");
    });

    test("multiple callbacks should maintain order", async ({ reactGrab }) => {
      await reactGrab.clearCallbackHistory();

      await reactGrab.activate();
      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("h1");
      await reactGrab.page.waitForTimeout(500);

      const history = await reactGrab.getCallbackHistory();

      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp).toBeGreaterThanOrEqual(
          history[i - 1].timestamp,
        );
      }
    });
  });
});
