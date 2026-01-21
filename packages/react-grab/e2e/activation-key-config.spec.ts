import { test, expect } from "./fixtures.js";

test.describe("Activation Key Configuration", () => {
  test.describe("Configuration via reinitialize", () => {
    test("should accept activationKey option", async ({ reactGrab }) => {
      await reactGrab.reinitialize({
        activationKey: "g",
      });

      const state = await reactGrab.getState();
      expect(typeof state.isActive).toBe("boolean");
    });

    test("should accept modifier+key activationKey", async ({ reactGrab }) => {
      await reactGrab.reinitialize({
        activationKey: "Meta+k",
      });

      const state = await reactGrab.getState();
      expect(typeof state.isActive).toBe("boolean");
    });

    test("should accept activationMode toggle option", async ({
      reactGrab,
    }) => {
      await reactGrab.reinitialize({
        activationKey: "g",
        activationMode: "toggle",
      });

      const state = await reactGrab.getState();
      expect(typeof state.isActive).toBe("boolean");
    });

    test("should accept activationMode hold option", async ({ reactGrab }) => {
      await reactGrab.reinitialize({
        activationKey: "Space",
        activationMode: "hold",
      });

      const state = await reactGrab.getState();
      expect(typeof state.isActive).toBe("boolean");
    });

    test("should accept keyHoldDuration option", async ({ reactGrab }) => {
      await reactGrab.reinitialize({
        keyHoldDuration: 200,
      });

      const state = await reactGrab.getState();
      expect(typeof state.isActive).toBe("boolean");
    });

    test("should accept allowActivationInsideInput option", async ({
      reactGrab,
    }) => {
      await reactGrab.reinitialize({
        allowActivationInsideInput: true,
      });

      const state = await reactGrab.getState();
      expect(typeof state.isActive).toBe("boolean");
    });

    test("should accept all options combined", async ({ reactGrab }) => {
      await reactGrab.reinitialize({
        activationKey: "Ctrl+Shift+g",
        activationMode: "toggle",
        keyHoldDuration: 150,
        allowActivationInsideInput: false,
      });

      const state = await reactGrab.getState();
      expect(typeof state.isActive).toBe("boolean");
    });
  });

  test.describe("API activation with default config", () => {
    test("should activate via API", async ({ reactGrab }) => {
      expect(await reactGrab.isOverlayVisible()).toBe(false);

      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });

    test("should deactivate via Escape", async ({ reactGrab }) => {
      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.deactivate();
      expect(await reactGrab.isOverlayVisible()).toBe(false);
    });

    test("should toggle via API", async ({ reactGrab }) => {
      await reactGrab.toggle();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.toggle();
      expect(await reactGrab.isOverlayVisible()).toBe(false);
    });
  });

  test.describe("Selection with default config", () => {
    test("should show selection box", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='todo-list'] h1");
      await reactGrab.waitForSelectionBox();

      expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
    });

    test("should copy element", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='todo-list'] h1");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("[data-testid='todo-list'] h1");
      await reactGrab.page.waitForTimeout(500);

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toContain("Todo List");
    });
  });

  test.describe("Dynamic option updates", () => {
    test("should update activationKey via updateOptions", async ({
      reactGrab,
    }) => {
      await reactGrab.updateOptions({
        activationKey: "k",
      });

      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });

    test("should update activationMode via updateOptions", async ({
      reactGrab,
    }) => {
      await reactGrab.updateOptions({
        activationMode: "hold",
      });

      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });

    test("should update keyHoldDuration via updateOptions", async ({
      reactGrab,
    }) => {
      await reactGrab.updateOptions({
        keyHoldDuration: 100,
      });

      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });
  });

  test.describe("Keyboard activation with hold duration", () => {
    test("should activate with default key after holding", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });

    test("should not activate without holding long enough", async ({
      reactGrab,
    }) => {
      await reactGrab.page.click("body");
      await reactGrab.page.keyboard.down("Meta");
      await reactGrab.page.keyboard.down("c");
      await reactGrab.page.waitForTimeout(50);
      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up("Meta");

      expect(await reactGrab.isOverlayVisible()).toBe(false);
    });
  });

  test.describe("Input field interaction", () => {
    test("should activate in input by default", async ({ reactGrab }) => {
      await reactGrab.page.click("[data-testid='test-input']");

      await reactGrab.page.keyboard.down("Meta");
      await reactGrab.page.keyboard.down("c");
      await reactGrab.page.waitForTimeout(350);
      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up("Meta");

      await expect
        .poll(() => reactGrab.isOverlayVisible(), { timeout: 1000 })
        .toBe(true);
    });

    test("should not activate in input when disabled", async ({
      reactGrab,
    }) => {
      await reactGrab.reinitialize({ allowActivationInsideInput: false });
      await reactGrab.page.click("[data-testid='test-input']");

      await reactGrab.page.keyboard.down("Meta");
      await reactGrab.page.keyboard.down("c");
      await expect
        .poll(() => reactGrab.isOverlayVisible(), { timeout: 2000 })
        .toBe(false);
      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up("Meta");
    });

    test("should activate outside input after clicking away", async ({
      reactGrab,
    }) => {
      await reactGrab.page.click("[data-testid='test-input']");
      await reactGrab.page.click("body", { position: { x: 10, y: 10 } });

      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });
  });

  test.describe("State persistence", () => {
    test("should maintain activation state after viewport resize", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.setViewportSize(1024, 768);
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.setViewportSize(1280, 720);
    });

    test("should maintain activation state after scroll", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.scrollPage(200);
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });
  });
});
