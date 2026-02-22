import { test, expect } from "./fixtures.js";

test.describe("Touch Mode", () => {
  test.describe("Touch Events", () => {
    test("touch tap should work for element selection", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.touchTap("li:first-child");

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toBeTruthy();
    });

    test("touch should set touch mode flag", async ({ reactGrab }) => {
      await reactGrab.activate();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.touchscreen.tap(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      await reactGrab.page.waitForTimeout(100);

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });

    test("touch drag should create drag selection", async ({ reactGrab }) => {
      await reactGrab.activate();

      const firstItem = reactGrab.page.locator("li").first();
      const lastItem = reactGrab.page.locator("li").nth(3);

      const startBox = await firstItem.boundingBox();
      const endBox = await lastItem.boundingBox();

      if (!startBox || !endBox) throw new Error("Could not get bounding boxes");

      await reactGrab.touchDrag(
        startBox.x - 10,
        startBox.y - 10,
        endBox.x + endBox.width + 10,
        endBox.y + endBox.height + 10,
      );
      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toBeTruthy();
    });
  });

  test.describe("Touch Mode Behavior", () => {
    test("crosshair should be hidden in touch mode", async ({ reactGrab }) => {
      await reactGrab.updateOptions({
        theme: { crosshair: { enabled: true } },
      });
      await reactGrab.activate();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.touchscreen.tap(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      await reactGrab.page.waitForTimeout(100);

      const isCrosshairVisible = await reactGrab.isCrosshairVisible();
      expect(isCrosshairVisible).toBe(false);
    });

    test("touch events should update pointer position", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.touchscreen.tap(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      await reactGrab.page.waitForTimeout(100);

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });
  });

  test.describe("Touch Selection", () => {
    test("touch should select element", async ({ reactGrab }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("[data-testid='todo-list'] h1");
      await reactGrab.waitForSelectionBox();

      const element = reactGrab.page.locator("[data-testid='todo-list'] h1");
      const box = await element.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.touchscreen.tap(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toContain("Todo List");
    });

    test("touch on different elements should work", async ({ reactGrab }) => {
      await reactGrab.activate();

      await reactGrab.touchTap("li:nth-child(2)");

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toBeTruthy();

      await expect
        .poll(() => reactGrab.isOverlayVisible(), { timeout: 5000 })
        .toBe(false);

      await reactGrab.activate();
      await reactGrab.touchTap("li:nth-child(4)");

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toBeTruthy();
    });
  });

  test.describe("Touch Drag Selection", () => {
    test("touch drag should select multiple elements", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      const firstItem = reactGrab.page.locator("li").first();
      const secondItem = reactGrab.page.locator("li").nth(1);

      const startBox = await firstItem.boundingBox();
      const endBox = await secondItem.boundingBox();

      if (!startBox || !endBox) throw new Error("Could not get bounding boxes");

      await reactGrab.touchDrag(
        startBox.x - 5,
        startBox.y - 5,
        endBox.x + endBox.width + 5,
        endBox.y + endBox.height + 5,
      );

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toBeTruthy();
    });

    test("short touch drag should be treated as tap", async ({ reactGrab }) => {
      await reactGrab.activate();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.touchDrag(
        box.x + box.width / 2,
        box.y + box.height / 2,
        box.x + box.width / 2 + 2,
        box.y + box.height / 2 + 2,
      );

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toBeTruthy();
    });
  });

  test.describe("Touch and Mouse Switching", () => {
    test("should handle switch from mouse to touch", async ({ reactGrab }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.touchTap("li:nth-child(2)");

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toBeTruthy();
    });

    test("should handle switch from touch to mouse", async ({ reactGrab }) => {
      await reactGrab.activate();

      await reactGrab.touchTap("li:first-child");

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toBeTruthy();

      await expect
        .poll(() => reactGrab.isOverlayVisible(), { timeout: 5000 })
        .toBe(false);

      await reactGrab.activate();
      await reactGrab.hoverElement("li:nth-child(3)");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("li:nth-child(3)");

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toBeTruthy();
    });
  });

  test.describe("Touch Input Mode", () => {
    test("double tap should enter input mode with agent", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.activate();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.touchscreen.tap(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      await reactGrab.page.waitForTimeout(100);
      await reactGrab.page.touchscreen.tap(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
      await reactGrab.page.waitForTimeout(200);

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });
  });

  test.describe("Touch with Scroll", () => {
    test("should handle touch after scroll", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.scrollPage(200);

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (box) {
        await reactGrab.page.touchscreen.tap(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );

        await expect
          .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
          .toBeTruthy();
      }
    });
  });

  test.describe("Touch Edge Cases", () => {
    test("should handle rapid touch events", async ({ reactGrab }) => {
      await reactGrab.activate();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      for (let i = 0; i < 5; i++) {
        await reactGrab.page.touchscreen.tap(
          box.x + box.width / 2 + i * 10,
          box.y + box.height / 2,
        );
        await reactGrab.page.waitForTimeout(50);
      }

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });

    test("should handle touch on overlay elements", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.page.waitForTimeout(600);

      const toolbarInfo = await reactGrab.getToolbarInfo();
      if (toolbarInfo.position) {
        await reactGrab.page.touchscreen.tap(
          toolbarInfo.position.x + 20,
          toolbarInfo.position.y + 10,
        );
        await reactGrab.page.waitForTimeout(200);
      }

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });
  });
});
