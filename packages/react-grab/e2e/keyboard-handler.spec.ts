import { test, expect } from "./fixtures.js";

// Mirrors WINDOW_REFOCUS_GRACE_PERIOD_MS in src/constants.ts. After the window
// regains focus, activation keys are ignored for this long so the modifiers used
// to alt-tab back don't accidentally activate the overlay.
const WINDOW_REFOCUS_GRACE_PERIOD_MS = 200;

test.describe("Global keyboard handler", () => {
  test.describe("Context-menu key", () => {
    test("opens the context menu via the ContextMenu key on the hovered selection", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("li");

      await reactGrab.pressKey("ContextMenu");

      await expect.poll(() => reactGrab.isContextMenuVisible(), { timeout: 5000 }).toBe(true);
    });

    test("opens the context menu via Shift+F10", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("li");

      await reactGrab.pressKeyCombo(["Shift"], "F10");

      await expect.poll(() => reactGrab.isContextMenuVisible(), { timeout: 5000 }).toBe(true);
    });

    test("ignores the ContextMenu key while inactive", async ({ reactGrab }) => {
      expect(await reactGrab.isOverlayVisible()).toBe(false);

      await reactGrab.pressKey("ContextMenu");
      await reactGrab.page.waitForTimeout(200);

      expect(await reactGrab.isContextMenuVisible()).toBe(false);
    });
  });

  test.describe("Window-refocus grace period", () => {
    test("suppresses keyboard activation immediately after the window regains focus", async ({
      reactGrab,
    }) => {
      expect(await reactGrab.isOverlayVisible()).toBe(false);

      // Hold the modifier first (harmless on its own), then fire the focus event
      // so only the single activation keydown needs to land inside the grace
      // window — keeping the assertion robust against slow CI round-trips.
      await reactGrab.page.keyboard.down(reactGrab.modifierKey);
      await reactGrab.page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await reactGrab.page.keyboard.down("c");
      await reactGrab.page.waitForTimeout(500);

      expect(await reactGrab.isOverlayVisible()).toBe(false);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.modifierKey);
    });

    test("allows keyboard activation once the grace period elapses", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await reactGrab.page.waitForTimeout(WINDOW_REFOCUS_GRACE_PERIOD_MS + 100);

      await reactGrab.activateViaKeyboard();

      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });
  });
});
