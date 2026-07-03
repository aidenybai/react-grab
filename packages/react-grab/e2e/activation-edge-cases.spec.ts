import { test, expect, type ReactGrabPageObject } from "./fixtures.js";

const HOLD_START_WAIT_MS = 50;
const BASE_ACTIVATION_WAIT_MS = 400;
const POST_RELEASE_WAIT_MS = 300;

const holdActivationCombo = async (reactGrab: ReactGrabPageObject, holdMs: number) => {
  await reactGrab.page.keyboard.down(reactGrab.modifierKey);
  await reactGrab.page.keyboard.down("c");
  await reactGrab.page.waitForTimeout(holdMs);
  await reactGrab.page.keyboard.up("c");
  await reactGrab.page.keyboard.up(reactGrab.modifierKey);
  await reactGrab.page.waitForTimeout(POST_RELEASE_WAIT_MS);
};

test.describe("Activation Edge Cases", () => {
  test.describe("Window refocus grace period", () => {
    test("should not activate from a keydown right after window regains focus", async ({
      reactGrab,
    }) => {
      await reactGrab.page.click("body");

      await reactGrab.page.evaluate(() => {
        window.dispatchEvent(new Event("blur"));
        window.dispatchEvent(new Event("focus"));
      });
      await reactGrab.page.keyboard.down(reactGrab.modifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.page.waitForTimeout(BASE_ACTIVATION_WAIT_MS);

      expect(await reactGrab.isOverlayVisible()).toBe(false);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.modifierKey);
    });

    test("should activate normally once the refocus grace period has passed", async ({
      reactGrab,
    }) => {
      await reactGrab.page.click("body");

      await reactGrab.page.evaluate(() => {
        window.dispatchEvent(new Event("blur"));
        window.dispatchEvent(new Event("focus"));
      });
      await reactGrab.page.waitForTimeout(300);

      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });
  });

  test.describe("Modifier chord dismissal", () => {
    test("should keep a keyboard-activated overlay active on modifier+other-key chord", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.pressModifierKeyCombo("b");
      await reactGrab.page.waitForTimeout(300);

      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });

    test("should keep a toggle-activated overlay active on modifier+other-key chord", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.pressModifierKeyCombo("b");
      await reactGrab.page.waitForTimeout(300);

      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });

    test("should cancel a pending hold on modifier+other-key chord", async ({ reactGrab }) => {
      await reactGrab.page.click("body");

      await reactGrab.page.keyboard.down(reactGrab.modifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.page.waitForTimeout(HOLD_START_WAIT_MS);
      await reactGrab.page.keyboard.press("b");
      await reactGrab.page.waitForTimeout(BASE_ACTIVATION_WAIT_MS);

      expect(await reactGrab.isOverlayVisible()).toBe(false);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.modifierKey);
    });
  });

  test.describe("Activation delays", () => {
    test("should delay activation while an input is focused", async ({ reactGrab }) => {
      await reactGrab.page.click("[data-testid='test-input']");

      await holdActivationCombo(reactGrab, 250);
      expect(await reactGrab.isOverlayVisible()).toBe(false);

      await reactGrab.page.click("[data-testid='test-input']");
      await holdActivationCombo(reactGrab, 800);
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });

    test("should delay activation longer when input text is selected", async ({ reactGrab }) => {
      await reactGrab.page.fill("[data-testid='test-input']", "some text to select");
      await reactGrab.page.click("[data-testid='test-input']");
      await reactGrab.page.evaluate(() => {
        const input = document.querySelector<HTMLInputElement>("[data-testid='test-input']");
        input?.select();
      });

      await holdActivationCombo(reactGrab, 400);
      expect(await reactGrab.isOverlayVisible()).toBe(false);
    });

    test("should delay activation when page text is selected", async ({ reactGrab }) => {
      const selectMainTitle = () =>
        reactGrab.page.evaluate(() => {
          const title = document.querySelector("[data-testid='main-title']");
          if (!title) return;
          const range = document.createRange();
          range.selectNodeContents(title);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        });

      await reactGrab.page.click("body");
      await selectMainTitle();
      await holdActivationCombo(reactGrab, 400);
      expect(await reactGrab.isOverlayVisible()).toBe(false);

      await selectMainTitle();
      await holdActivationCombo(reactGrab, 1_100);
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });

    test("should honor a custom keyHoldDuration via keyboard hold", async ({ reactGrab }) => {
      await reactGrab.updateOptions({ keyHoldDuration: 600 });
      await reactGrab.page.click("body");

      await holdActivationCombo(reactGrab, 300);
      expect(await reactGrab.isOverlayVisible()).toBe(false);

      await holdActivationCombo(reactGrab, 1_000);
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });
  });

  test.describe("Context menu key", () => {
    test("should open the context menu with Shift+F10 on the hovered element", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("[data-testid='main-title']");

      await reactGrab.pressKeyCombo(["Shift"], "F10");

      await expect.poll(() => reactGrab.isContextMenuVisible(), { timeout: 3_000 }).toBe(true);
    });

    test("should open the context menu with the ContextMenu key", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("[data-testid='main-title']");

      await reactGrab.pressKey("ContextMenu");

      await expect.poll(() => reactGrab.isContextMenuVisible(), { timeout: 3_000 }).toBe(true);
    });

    test("should ignore Shift+F10 while the context menu is already open", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("[data-testid='main-title']");
      await reactGrab.pressKeyCombo(["Shift"], "F10");
      await expect.poll(() => reactGrab.isContextMenuVisible(), { timeout: 3_000 }).toBe(true);

      await reactGrab.pressKeyCombo(["Shift"], "F10");
      await reactGrab.page.waitForTimeout(200);

      expect(await reactGrab.isContextMenuVisible()).toBe(true);
    });
  });

  test.describe("Space drag repositioning", () => {
    test("should reposition the drag rectangle while Space is held", async ({ reactGrab }) => {
      await reactGrab.activate();

      const firstItem = reactGrab.page.locator("li").first();
      const box = await firstItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 10, box.y - 10);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 120, box.y + 80, { steps: 5 });

      const boundsBefore = await reactGrab.getDragBoxBounds();
      expect(boundsBefore).not.toBeNull();

      await reactGrab.page.keyboard.down(" ");
      await reactGrab.page.mouse.move(box.x + 180, box.y + 140, { steps: 5 });
      await reactGrab.page.keyboard.up(" ");

      const boundsAfter = await reactGrab.getDragBoxBounds();
      expect(boundsAfter).not.toBeNull();
      if (boundsBefore && boundsAfter) {
        expect(boundsAfter.x).toBeGreaterThan(boundsBefore.x);
        expect(boundsAfter.y).toBeGreaterThan(boundsBefore.y);
      }

      await reactGrab.page.mouse.up();

      const state = await reactGrab.getState();
      expect(state.isDragging).toBe(false);
    });
  });
});
