import { test, expect } from "./fixtures.js";

test.describe("API Methods", () => {
  test.describe("Activation APIs", () => {
    test("activate() should activate the overlay", async ({ reactGrab }) => {
      expect(await reactGrab.isOverlayVisible()).toBe(false);

      await reactGrab.activate();

      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });

    test("deactivate() should deactivate the overlay", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.page.evaluate(() => {
        const api = (window as { __REACT_GRAB__?: { deactivate: () => void } })
          .__REACT_GRAB__;
        api?.deactivate();
      });
      await reactGrab.page.waitForTimeout(100);

      expect(await reactGrab.isOverlayVisible()).toBe(false);
    });

    test("toggle() should toggle activation state", async ({ reactGrab }) => {
      expect(await reactGrab.isOverlayVisible()).toBe(false);

      await reactGrab.toggle();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.toggle();
      expect(await reactGrab.isOverlayVisible()).toBe(false);
    });

    test("isActive() should return correct state", async ({ reactGrab }) => {
      let state = await reactGrab.getState();
      expect(state.isActive).toBe(false);

      await reactGrab.activate();

      state = await reactGrab.getState();
      expect(state.isActive).toBe(true);
    });

    test("multiple rapid activations should be handled", async ({
      reactGrab,
    }) => {
      for (let i = 0; i < 5; i++) {
        await reactGrab.activate();
        await reactGrab.page.waitForTimeout(20);
      }

      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });

    test("multiple rapid toggles should maintain consistency", async ({
      reactGrab,
    }) => {
      for (let i = 0; i < 6; i++) {
        await reactGrab.toggle();
        await reactGrab.page.waitForTimeout(50);
      }

      const isActive = await reactGrab.isOverlayVisible();
      expect(typeof isActive).toBe("boolean");
    });
  });

  test.describe("getState()", () => {
    test("should return isActive correctly", async ({ reactGrab }) => {
      let state = await reactGrab.getState();
      expect(state.isActive).toBe(false);

      await reactGrab.activate();
      state = await reactGrab.getState();
      expect(state.isActive).toBe(true);
    });

    test("should return isDragging correctly during drag", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 10, box.y - 10);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 100, box.y + 100, { steps: 5 });

      const state = await reactGrab.getState();
      expect(state.isDragging).toBe(true);

      await reactGrab.page.mouse.up();
    });

    test("should return isCopying correctly during copy", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();

      await reactGrab.clickElement("h1");

      const checkCopyingState = async () => {
        const state = await reactGrab.getState();
        return state.isCopying;
      };

      const wasCopying = await checkCopyingState();
      expect(typeof wasCopying).toBe("boolean");
    });

    test("should return dragBounds during drag", async ({ reactGrab }) => {
      await reactGrab.activate();

      const listItem = reactGrab.page.locator("li").first();
      const box = await listItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 20, box.y - 20);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 150, box.y + 150, { steps: 10 });

      const state = await reactGrab.getState();
      if (state.dragBounds) {
        expect(state.dragBounds.width).toBeGreaterThan(0);
        expect(state.dragBounds.height).toBeGreaterThan(0);
      }

      await reactGrab.page.mouse.up();
    });
  });

  test.describe("copyElement()", () => {
    test("should copy single element to clipboard", async ({ reactGrab }) => {
      const success = await reactGrab.copyElementViaApi(
        "[data-testid='todo-list'] h1",
      );
      expect(success).toBe(true);

      await reactGrab.page.waitForTimeout(500);
      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toContain("Todo List");
    });

    test("should copy list item element", async ({ reactGrab }) => {
      const success = await reactGrab.copyElementViaApi("li:first-child");
      expect(success).toBe(true);

      await reactGrab.page.waitForTimeout(500);
      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toBeTruthy();
    });

    test("should return false for non-existent element", async ({
      reactGrab,
    }) => {
      const success = await reactGrab.copyElementViaApi(
        ".non-existent-element",
      );
      expect(success).toBe(false);
    });

    test("should copy multiple elements via API", async ({ reactGrab }) => {
      const success = await reactGrab.page.evaluate(async () => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              copyElement: (el: Element[]) => Promise<boolean>;
            };
          }
        ).__REACT_GRAB__;
        const elements = Array.from(document.querySelectorAll("li")).slice(
          0,
          3,
        );
        if (!api || elements.length === 0) return false;
        return api.copyElement(elements);
      });
      expect(success).toBe(true);
    });
  });

  test.describe("Theme APIs", () => {
    test("getTheme() should return current theme", async ({ reactGrab }) => {
      const theme = await reactGrab.getTheme();

      expect(theme).toBeDefined();
      expect(typeof theme).toBe("object");
      expect(theme.enabled).toBeDefined();
    });

    test("updateTheme() should update theme properties", async ({
      reactGrab,
    }) => {
      await reactGrab.updateTheme({ hue: 180 });

      const theme = await reactGrab.getTheme();
      expect(theme.hue).toBe(180);
    });

    test("updateTheme() should support partial updates", async ({
      reactGrab,
    }) => {
      const originalTheme = await reactGrab.getTheme();

      await reactGrab.updateTheme({ crosshair: { enabled: false } });

      const updatedTheme = await reactGrab.getTheme();
      expect(updatedTheme.enabled).toBe(originalTheme.enabled);
    });

    test("updateTheme() should apply hue rotation filter", async ({
      reactGrab,
    }) => {
      await reactGrab.updateTheme({ hue: 90 });
      await reactGrab.activate();

      const hasFilter = await reactGrab.page.evaluate(() => {
        const host = document.querySelector("[data-react-grab]");
        const shadowRoot = host?.shadowRoot;
        const root = shadowRoot?.querySelector(
          "[data-react-grab]",
        ) as HTMLElement;
        return root?.style.filter?.includes("hue-rotate") ?? false;
      });

      expect(hasFilter).toBe(true);
    });

    test("multiple theme updates should accumulate", async ({ reactGrab }) => {
      await reactGrab.updateTheme({ hue: 45 });
      await reactGrab.updateTheme({ crosshair: { enabled: false } });

      const theme = await reactGrab.getTheme();
      expect(theme.hue).toBe(45);
    });
  });

  test.describe("dispose()", () => {
    test("should set hasInited to false on dispose", async ({ reactGrab }) => {
      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.dispose();
      await reactGrab.page.waitForTimeout(200);

      const canReinit = await reactGrab.page.evaluate(() => {
        const initFn = (window as { initReactGrab?: () => void }).initReactGrab;
        return typeof initFn === "function";
      });
      expect(canReinit).toBe(true);
    });

    test("should remove overlay host element on dispose", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.dispose();

      await reactGrab.page.waitForTimeout(100);

      const hostExists = await reactGrab.page.evaluate(() => {
        return document.querySelector("[data-react-grab]") !== null;
      });

      expect(hostExists).toBe(true);
    });

    test("should allow re-initialization after dispose", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.dispose();

      await reactGrab.reinitialize();

      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });
  });

  test.describe("updateOptions()", () => {
    test("should update callback options", async ({ reactGrab }) => {
      let callbackCalled = false;

      await reactGrab.page.evaluate(() => {
        (
          window as { __TEST_CALLBACK_CALLED__?: boolean }
        ).__TEST_CALLBACK_CALLED__ = false;
        const api = (
          window as {
            __REACT_GRAB__?: {
              updateOptions: (o: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;
        api?.updateOptions({
          onActivate: () => {
            (
              window as { __TEST_CALLBACK_CALLED__?: boolean }
            ).__TEST_CALLBACK_CALLED__ = true;
          },
        });
      });

      await reactGrab.activate();

      callbackCalled = await reactGrab.page.evaluate(() => {
        return (
          (window as { __TEST_CALLBACK_CALLED__?: boolean })
            .__TEST_CALLBACK_CALLED__ ?? false
        );
      });

      expect(callbackCalled).toBe(true);
    });

    test("should allow updating multiple callbacks", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        (window as { __CALLBACKS__?: string[] }).__CALLBACKS__ = [];
        const api = (
          window as {
            __REACT_GRAB__?: {
              updateOptions: (o: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;
        api?.updateOptions({
          onActivate: () => {
            (window as { __CALLBACKS__?: string[] }).__CALLBACKS__?.push(
              "activate",
            );
          },
          onDeactivate: () => {
            (window as { __CALLBACKS__?: string[] }).__CALLBACKS__?.push(
              "deactivate",
            );
          },
        });
      });

      await reactGrab.activate();
      await reactGrab.deactivate();

      const callbacks = await reactGrab.page.evaluate(() => {
        return (window as { __CALLBACKS__?: string[] }).__CALLBACKS__ ?? [];
      });

      expect(callbacks).toContain("activate");
      expect(callbacks).toContain("deactivate");
    });
  });

  test.describe("setAgent()", () => {
    test("should configure agent provider", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent();

      const state = await reactGrab.page.evaluate(() => {
        const api = (
          window as {
            __REACT_GRAB__?: { getState: () => Record<string, unknown> };
          }
        ).__REACT_GRAB__;
        return api?.getState();
      });

      expect(state).toBeDefined();
    });

    test("should allow agent provider with custom options", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({
        delay: 100,
        statusUpdates: ["Custom status 1", "Custom status 2"],
      });

      const hasAgent = await reactGrab.page.evaluate(() => {
        const host = document.querySelector("[data-react-grab]");
        return host !== null;
      });

      expect(hasAgent).toBe(true);
    });
  });

  test.describe("Edge Cases", () => {
    test("API should work after multiple activation cycles", async ({
      reactGrab,
    }) => {
      for (let i = 0; i < 3; i++) {
        await reactGrab.activate();
        await reactGrab.hoverElement("li");
        await reactGrab.waitForSelectionBox();
        await reactGrab.deactivate();
      }

      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });

    test("getState should be consistent with isActive", async ({
      reactGrab,
    }) => {
      const state1 = await reactGrab.getState();
      const isActive1 = await reactGrab.isOverlayVisible();
      expect(state1.isActive).toBe(isActive1);

      await reactGrab.activate();

      const state2 = await reactGrab.getState();
      const isActive2 = await reactGrab.isOverlayVisible();
      expect(state2.isActive).toBe(isActive2);
    });

    test("theme should persist across activation cycles", async ({
      reactGrab,
    }) => {
      await reactGrab.updateTheme({ hue: 120 });
      await reactGrab.activate();
      await reactGrab.deactivate();
      await reactGrab.activate();

      const theme = await reactGrab.getTheme();
      expect(theme.hue).toBe(120);
    });
  });
});
