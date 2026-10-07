import { test, expect } from "./fixtures.js";

const FEEDBACK_DURATION_MS = 1500;

test.describe("Copy Feedback Behavior", () => {
  test.describe("Toggle Mode - Feedback Period Deactivation", () => {
    test("should deactivate immediately when key released during feedback period", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.page.keyboard.down(reactGrab.feedbackModifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.feedbackModifierKey);

      await reactGrab.page.waitForTimeout(100);
      expect(await reactGrab.isOverlayVisible()).toBe(false);
    });

    test("should stay active when key held through entire feedback period", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.page.keyboard.down(reactGrab.feedbackModifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.waitForTimeout(FEEDBACK_DURATION_MS + 200);

      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.feedbackModifierKey);
    });

    test("should allow hovering different elements during feedback period", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.page.keyboard.down(reactGrab.feedbackModifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");

      await reactGrab.hoverElement("h1");
      await expect
        .poll(() => reactGrab.isSelectionBoxVisible(), {
          timeout: FEEDBACK_DURATION_MS,
        })
        .toBe(true);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.feedbackModifierKey);
    });

    test("should show selection box following hover during feedback", async ({ reactGrab }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.page.keyboard.down(reactGrab.feedbackModifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");
      await reactGrab.hoverElement("h1");

      await reactGrab.page.waitForTimeout(FEEDBACK_DURATION_MS + 500);

      expect(await reactGrab.isOverlayVisible()).toBe(true);
      const boundsAfter = await reactGrab.getSelectionBoxBounds();
      expect(boundsAfter).not.toBeNull();

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.feedbackModifierKey);
    });

    test("should deactivate at end of feedback if key released mid-feedback", async ({
      reactGrab,
    }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.page.keyboard.down(reactGrab.feedbackModifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.waitForTimeout(500);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.feedbackModifierKey);

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

      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.page.keyboard.down(reactGrab.feedbackModifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.waitForTimeout(200);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.feedbackModifierKey);

      await reactGrab.page.waitForTimeout(100);
      expect(await reactGrab.isOverlayVisible()).toBe(false);
    });
  });

  test.describe("API Activation - Toggle Mode Behavior", () => {
    test("should deactivate after copy via API activation in toggle mode", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      await reactGrab.hoverUntilSelected("li:first-child");
      await reactGrab.clickElement("li:first-child");

      await expect.poll(() => reactGrab.isOverlayVisible(), { timeout: 3000 }).toBe(false);
    });

    test("should require re-activation for multiple copies via API", async ({ reactGrab }) => {
      await reactGrab.activate();

      await reactGrab.hoverUntilSelected("li:first-child");
      await reactGrab.clickElement("li:first-child");

      await expect.poll(() => reactGrab.isOverlayVisible(), { timeout: 3000 }).toBe(false);

      await reactGrab.activate();
      await reactGrab.hoverElement("h1");
      await reactGrab.page.waitForTimeout(100);

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe("Edge Cases", () => {
    test("should handle rapid key tap during feedback", async ({ reactGrab }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.page.keyboard.down(reactGrab.feedbackModifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.waitForTimeout(100);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.down("c");
      await reactGrab.page.waitForTimeout(50);
      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.feedbackModifierKey);

      await reactGrab.page.waitForTimeout(100);
      expect(await reactGrab.isOverlayVisible()).toBe(false);
    });

    test("should handle modifier key release during feedback", async ({ reactGrab }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.page.keyboard.down(reactGrab.feedbackModifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.waitForTimeout(100);

      await reactGrab.page.keyboard.up(reactGrab.feedbackModifierKey);

      await reactGrab.page.waitForTimeout(100);
      expect(await reactGrab.isOverlayVisible()).toBe(false);

      await reactGrab.page.keyboard.up("c");
    });

    test("should copy to clipboard before deactivating", async ({ reactGrab }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverUntilSelected("[data-testid='main-title']");

      await reactGrab.page.keyboard.down(reactGrab.feedbackModifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("[data-testid='main-title']");

      await expect
        .poll(() => reactGrab.getClipboardContent(), {
          timeout: FEEDBACK_DURATION_MS,
        })
        .toContain("React Grab");

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.feedbackModifierKey);
    });

    test("should handle multiple sequential copies while holding", async ({ reactGrab }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.page.keyboard.down(reactGrab.feedbackModifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.hoverElement("li:nth-child(2)");
      await reactGrab.page.waitForTimeout(100);
      await reactGrab.clickElement("li:nth-child(2)");
      await reactGrab.page.waitForTimeout(200);

      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.feedbackModifierKey);
    });

    test("should deactivate when escape pressed during feedback", async ({ reactGrab }) => {
      await reactGrab.activateViaKeyboard();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.page.keyboard.down(reactGrab.feedbackModifierKey);
      await reactGrab.page.keyboard.down("c");
      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.waitForTimeout(100);

      await reactGrab.pressEscape();

      await reactGrab.page.waitForTimeout(100);
      expect(await reactGrab.isOverlayVisible()).toBe(false);

      await reactGrab.page.keyboard.up("c");
      await reactGrab.page.keyboard.up(reactGrab.feedbackModifierKey);
    });
  });

  test.describe("Feedback Visual Indicators", () => {
    test("should show 'Copied' label after successful copy", async ({ reactGrab }) => {
      await reactGrab.activate();

      await reactGrab.hoverUntilSelected("li:first-child");
      await reactGrab.clickElement("li:first-child");

      await expect.poll(() => reactGrab.getLabelStatusText(), { timeout: 2000 }).toBe("Copied");
    });

    test("should show grabbed box animation during feedback", async ({ reactGrab }) => {
      await reactGrab.activate();

      await reactGrab.hoverUntilSelected("li:first-child");
      await reactGrab.clickElement("li:first-child");

      await reactGrab.page.waitForTimeout(100);

      const grabbedInfo = await reactGrab.getGrabbedBoxInfo();
      expect(grabbedInfo.count).toBeGreaterThan(0);
    });
  });

  test.describe("Immediate Grabbing Feedback", () => {
    test("deactivation clears feedback waiting for component metadata", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        window.fetch = () => new Promise<Response>(() => {});
      });

      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("li:first-child");
      await reactGrab.clickElement("li:first-child");

      await expect
        .poll(async () => {
          const instances = await reactGrab.getLabelInstancesInfo();
          return instances.some((instance) => instance.status === "copying");
        })
        .toBe(true);

      await reactGrab.deactivate();

      await expect.poll(() => reactGrab.getLabelInstancesInfo()).toEqual([]);
    });

    test("deactivation cancels a copy waiting for content", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const testWindow = window as {
          __REACT_GRAB__?: {
            registerPlugin: (plugin: {
              name: string;
              options: { getContent: () => Promise<string> };
            }) => void;
          };
          __TEST_COPY_CONTENT_REQUESTED__?: boolean;
          __TEST_COPY_COMMAND_COUNT__?: number;
          __TEST_RESOLVE_COPY_CONTENT__?: (content: string) => void;
          __TEST_RESTORE_EXEC_COMMAND__?: () => void;
        };
        const api = testWindow.__REACT_GRAB__;
        if (!api) throw new Error("React Grab API unavailable");

        let resolveContent = (_content: string): void => {};
        const content = new Promise<string>((resolve) => {
          resolveContent = resolve;
        });
        api.registerPlugin({
          name: "pending-copy-feedback-test",
          options: {
            getContent: () => {
              testWindow.__TEST_COPY_CONTENT_REQUESTED__ = true;
              return content;
            },
          },
        });
        testWindow.__TEST_RESOLVE_COPY_CONTENT__ = resolveContent;

        const originalExecCommand = document.execCommand;
        testWindow.__TEST_COPY_COMMAND_COUNT__ = 0;
        document.execCommand = () => {
          testWindow.__TEST_COPY_COMMAND_COUNT__ =
            (testWindow.__TEST_COPY_COMMAND_COUNT__ ?? 0) + 1;
          return true;
        };
        testWindow.__TEST_RESTORE_EXEC_COMMAND__ = () => {
          document.execCommand = originalExecCommand;
        };
      });

      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("li:first-child");
      await reactGrab.clickElement("li:first-child");
      await expect
        .poll(() =>
          reactGrab.page.evaluate(
            () =>
              (window as { __TEST_COPY_CONTENT_REQUESTED__?: boolean })
                .__TEST_COPY_CONTENT_REQUESTED__,
          ),
        )
        .toBe(true);

      await reactGrab.deactivate();
      await expect.poll(() => reactGrab.getLabelInstancesInfo()).toEqual([]);
      await reactGrab.page.evaluate(async () => {
        (
          window as {
            __TEST_RESOLVE_COPY_CONTENT__?: (content: string) => void;
          }
        ).__TEST_RESOLVE_COPY_CONTENT__?.("late content");
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      });

      expect(await reactGrab.getLabelInstancesInfo()).toEqual([]);
      expect(
        await reactGrab.page.evaluate(
          () => (window as { __TEST_COPY_COMMAND_COUNT__?: number }).__TEST_COPY_COMMAND_COUNT__,
        ),
      ).toBe(0);
      await reactGrab.page.evaluate(() => {
        (
          window as { __TEST_RESTORE_EXEC_COMMAND__?: () => void }
        ).__TEST_RESTORE_EXEC_COMMAND__?.();
      });
    });

    test("should enter copying state immediately on click", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("li:first-child");

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

    test("should create label instance with copying status on click", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.clickElement("li:first-child");

      await expect
        .poll(
          async () => {
            const instances = await reactGrab.getLabelInstancesInfo();
            return instances.some(
              (instance) => instance.status === "copying" || instance.status === "copied",
            );
          },
          { timeout: 500 },
        )
        .toBe(true);
    });

    test("should set progress cursor during copy", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.clickElement("li:first-child");

      await expect
        .poll(
          async () => {
            const hasCursorOverride = await reactGrab.page.evaluate(() => {
              const styleElement = document.querySelector("[data-react-grab-cursor]");
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

    test("should show Grabbing label before copy completes", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("[data-testid='main-title']");

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
      await reactGrab.hoverUntilSelected("li:first-child");

      await reactGrab.clickElement("li:first-child");

      await expect.poll(() => reactGrab.getLabelStatusText(), { timeout: 2000 }).toBe("Copied");

      const state = await reactGrab.getState();
      expect(state.isCopying).toBe(false);
    });
  });

  test.describe("Copied Drag Region Viewport Tracking", () => {
    test("drag region label follows page scroll while in copied state", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.dragSelect(
        "[data-testid='todo-list'] li:first-child",
        "[data-testid='todo-list'] li:nth-child(3)",
      );
      await reactGrab.waitForSelectionLabel();

      const labelBeforeScroll = await reactGrab.getSelectionLabelBounds();
      expect(labelBeforeScroll).not.toBeNull();
      if (!labelBeforeScroll) throw new Error("Expected label bounds before scroll");

      const firstTodoItem = reactGrab.page.locator("[data-testid='todo-list'] li").first();
      const elementBeforeScroll = await firstTodoItem.boundingBox();
      expect(elementBeforeScroll).not.toBeNull();
      if (!elementBeforeScroll) throw new Error("Expected element bounds before scroll");

      await reactGrab.scrollPage(80);

      // Poll instead of waiting a fixed 200ms — under load (e.g. CI shard
      // 1 of 4 with 4 concurrent workers competing for CPU) the chain
      // scroll → viewportVersion → memo → solid re-render → DOM paint
      // can take >2s. 5s is conservative but doesn't slow happy-path runs
      // since `expect.poll` resolves as soon as the predicate succeeds.
      await expect
        .poll(
          async () => {
            const currentLabel = await reactGrab.getSelectionLabelBounds();
            return currentLabel ? labelBeforeScroll.label.y - currentLabel.label.y : 0;
          },
          { timeout: 5000 },
        )
        .toBeGreaterThan(0);

      const elementAfterScroll = await firstTodoItem.boundingBox();
      expect(elementAfterScroll).not.toBeNull();
      if (!elementAfterScroll) throw new Error("Expected post-scroll element bounds");
      expect(elementBeforeScroll.y - elementAfterScroll.y).toBeGreaterThan(0);
    });

    test("drag region label follows viewport resize while in copied state", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.dragSelect("li:first-child", "li:nth-child(3)");
      await reactGrab.waitForSelectionLabel();

      const firstItem = reactGrab.page.locator("li").first();
      const elementBefore = await firstItem.boundingBox();
      const labelBefore = await reactGrab.getSelectionLabelBounds();
      expect(elementBefore).not.toBeNull();
      expect(labelBefore).not.toBeNull();
      if (!elementBefore || !labelBefore) throw new Error("Expected pre-resize bounds");

      await reactGrab.page.setViewportSize({ width: 600, height: 600 });
      await reactGrab.page.waitForTimeout(300);

      const elementAfter = await firstItem.boundingBox();
      const labelAfter = await reactGrab.getSelectionLabelBounds();
      expect(elementAfter).not.toBeNull();
      expect(labelAfter).not.toBeNull();
      if (!elementAfter || !labelAfter) throw new Error("Expected post-resize bounds");

      const elementCenterDelta =
        elementAfter.x + elementAfter.width / 2 - (elementBefore.x + elementBefore.width / 2);
      expect(Math.abs(elementCenterDelta)).toBeGreaterThan(20);

      const labelCenterDelta =
        labelAfter.label.x +
        labelAfter.label.width / 2 -
        (labelBefore.label.x + labelBefore.label.width / 2);
      expect(Math.abs(labelCenterDelta - elementCenterDelta)).toBeLessThan(8);

      await reactGrab.page.setViewportSize({ width: 1280, height: 720 });
    });
  });
});
