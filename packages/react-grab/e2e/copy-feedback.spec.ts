import { test, expect } from "./fixtures.js";

const FEEDBACK_DURATION_MS = 1500;

test.describe("Copy Feedback Behavior", () => {
  test.describe("Toggle Mode - Feedback Period Deactivation", () => {
    test("should deactivate immediately when key released during feedback period", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.keyboard.down(reactGrab.modifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.modifierKey);

      await reactGrab.page.waitForTimeout(100);
      expect(await reactGrab.isOverlayVisible()).toBe(false);
    });

    test("should stay active when key held through entire feedback period", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.keyboard.down(reactGrab.modifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.waitForTimeout(FEEDBACK_DURATION_MS + 200);

      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.modifierKey);
    });

    test("should allow hovering different elements during feedback period", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.keyboard.down(reactGrab.modifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");

      await reactGrab.hoverElement("h1");
      await expect
        .poll(() => reactGrab.isSelectionBoxVisible(), {
          timeout: FEEDBACK_DURATION_MS,
        })
        .toBe(true);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.modifierKey);
    });

    test("should show selection box following hover during feedback", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.keyboard.down(reactGrab.modifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");
      await reactGrab.hoverElement("h1");

      await reactGrab.page.waitForTimeout(FEEDBACK_DURATION_MS + 500);

      expect(await reactGrab.isOverlayVisible()).toBe(true);
      const boundsAfter = await reactGrab.getSelectionBoxBounds();
      expect(boundsAfter).not.toBeNull();

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.modifierKey);
    });

    test("should deactivate at end of feedback if key released mid-feedback", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.keyboard.down(reactGrab.modifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.waitForTimeout(500);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.modifierKey);

      await reactGrab.page.waitForTimeout(100);
      expect(await reactGrab.isOverlayVisible()).toBe(false);
    });
  });

  test.describe("Hold Mode - Feedback Period Behavior", () => {
    test("should deactivate immediately when key released during feedback in hold mode", async ({
      reactGrab,
    }) => {
      await reactGrab.updateOptions({ activationMode: "hold" });

      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.keyboard.down(reactGrab.modifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.waitForTimeout(200);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.modifierKey);

      await reactGrab.page.waitForTimeout(100);
      expect(await reactGrab.isOverlayVisible()).toBe(false);
    });
  });

  test.describe("API Activation - Toggle Mode Behavior", () => {
    test("should deactivate after copy via API activation in toggle mode", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("li:first-child");

      await expect
        .poll(() => reactGrab.isOverlayVisible(), { timeout: 3000 })
        .toBe(false);
    });

    test("should require re-activation for multiple copies via API", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("li:first-child");

      await expect
        .poll(() => reactGrab.isOverlayVisible(), { timeout: 3000 })
        .toBe(false);

      await reactGrab.activate();
      await reactGrab.hoverElement("h1");
      await reactGrab.page.waitForTimeout(100);

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe("Edge Cases", () => {
    test("should handle rapid key tap during feedback", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.keyboard.down(reactGrab.modifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.waitForTimeout(100);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.down("c");
      await reactGrab.page.waitForTimeout(50);
      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.modifierKey);

      await reactGrab.page.waitForTimeout(100);
      expect(await reactGrab.isOverlayVisible()).toBe(false);
    });

    test("should handle modifier key release during feedback", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.keyboard.down(reactGrab.modifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.waitForTimeout(100);

      await reactGrab.page.keyboard.up(reactGrab.modifierKey);

      await reactGrab.page.waitForTimeout(100);
      expect(await reactGrab.isOverlayVisible()).toBe(false);

      await reactGrab.page.keyboard.up("c");
    });

    test("should copy to clipboard before deactivating", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverElement("[data-testid='main-title']");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.keyboard.down(reactGrab.modifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("[data-testid='main-title']");

      await expect
        .poll(() => reactGrab.getClipboardContent(), {
          timeout: FEEDBACK_DURATION_MS,
        })
        .toContain("React Grab");

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.modifierKey);
    });

    test("should handle multiple sequential copies while holding", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.keyboard.down(reactGrab.modifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverElement("li:nth-child(2)");
      await reactGrab.page.waitForTimeout(100);
      await reactGrab.clickElement("li:nth-child(2)");
      await reactGrab.page.waitForTimeout(200);

      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.modifierKey);
    });

    test("should deactivate when escape pressed during feedback", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.keyboard.down(reactGrab.modifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.waitForTimeout(100);

      await reactGrab.pressEscape();

      await reactGrab.page.waitForTimeout(100);
      expect(await reactGrab.isOverlayVisible()).toBe(false);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.modifierKey);
    });
  });

  test.describe("Feedback Visual Indicators", () => {
    test("should show 'Copied' label after successful copy", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("li:first-child");

      await expect
        .poll(() => reactGrab.getLabelStatusText(), { timeout: 2000 })
        .toBe("Copied");
    });

    test("should show grabbed box animation during feedback", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.waitForTimeout(100);

      const grabbedInfo = await reactGrab.getGrabbedBoxInfo();
      expect(grabbedInfo.count).toBeGreaterThan(0);
    });
  });

  test.describe("Immediate Grabbing Feedback", () => {
    test("should enter copying state immediately on click", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("li:first-child");

      await expect
        .poll(
          async () => {
            const state = await reactGrab.getState();
            return state.isCopying || state.labelInstances.length > 0;
          },
          { timeout: 500 },
        )
        .toBe(true);
    });

    test("should create label instance with copying status on click", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("li:first-child");

      await expect
        .poll(
          async () => {
            const instances = await reactGrab.getLabelInstancesInfo();
            return instances.some(
              (instance) =>
                instance.status === "copying" || instance.status === "copied",
            );
          },
          { timeout: 500 },
        )
        .toBe(true);
    });

    test("should set progress cursor during copy", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("li:first-child");

      await expect
        .poll(
          async () => {
            const hasCursorOverride = await reactGrab.page.evaluate(() => {
              const styleElement = document.querySelector(
                "[data-react-grab-cursor]",
              );
              if (!styleElement) return false;
              return styleElement.textContent?.includes("progress") ?? false;
            });
            const state = await reactGrab.getState();
            return hasCursorOverride || state.labelInstances.length > 0;
          },
          { timeout: 500 },
        )
        .toBe(true);
    });

    test("should show Grabbing label before copy completes", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='main-title']");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("[data-testid='main-title']");

      await expect
        .poll(
          async () => {
            const statusText = await reactGrab.getLabelStatusText();
            return statusText !== null;
          },
          { timeout: 2000 },
        )
        .toBe(true);
    });

    test("should transition from Grabbing to Copied", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("li:first-child");

      await expect
        .poll(() => reactGrab.getLabelStatusText(), { timeout: 2000 })
        .toBe("Copied");

      const state = await reactGrab.getState();
      expect(state.isCopying).toBe(false);
    });
  });
});
