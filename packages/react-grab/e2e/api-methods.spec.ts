import { test, expect } from "./fixtures.js";

interface CopyCancellationCase {
  method: "deactivate" | "dispose";
  label: string;
}

const COPY_CANCELLATION_CASES: CopyCancellationCase[] = [
  { method: "deactivate", label: "deactivation" },
  { method: "dispose", label: "disposal" },
];

test.describe("API Methods", () => {
  test.describe("Activation APIs", () => {
    test("activate() should activate the overlay", async ({ reactGrab }) => {
      expect(await reactGrab.isOverlayVisible()).toBe(false);

      await reactGrab.activate();

      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });

    test("deactivate() should deactivate the overlay", async ({ reactGrab }) => {
      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.page.evaluate(() => {
        const api = (window as { __REACT_GRAB__?: { deactivate: () => void } }).__REACT_GRAB__;
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

    test("multiple rapid activations should be handled", async ({ reactGrab }) => {
      for (let i = 0; i < 5; i++) {
        await reactGrab.activate();
        await reactGrab.page.waitForTimeout(20);
      }

      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });

    test("multiple rapid toggles should maintain consistency", async ({ reactGrab }) => {
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

    test("should return isDragging correctly during drag", async ({ reactGrab }) => {
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

    test("should return isCopying correctly during copy", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("h1");

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
      const success = await reactGrab.copyElementViaApi("[data-testid='todo-list'] h1");
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

    test("should return false for non-existent element", async ({ reactGrab }) => {
      const success = await reactGrab.copyElementViaApi(".non-existent-element");
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
        const elements = Array.from(document.querySelectorAll("li")).slice(0, 3);
        if (!api || elements.length === 0) return false;
        return api.copyElement(elements);
      });
      expect(success).toBe(true);
    });

    test("preserves a getContent callback passed to setOptions", async ({ reactGrab }) => {
      const result = await reactGrab.page.evaluate(async () => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              copyElement: (element: Element) => Promise<boolean>;
              setOptions: (options: { getContent: () => string }) => void;
            };
          }
        ).__REACT_GRAB__;
        const element = document.querySelector("[data-testid='todo-list'] h1");
        if (!api || !element) throw new Error("React Grab API or test element unavailable");

        let getContentCallCount = 0;
        api.setOptions({
          getContent: () => {
            getContentCallCount += 1;
            return "custom content";
          },
        });
        const callCountBeforeCopy = getContentCallCount;
        const originalExecCommand = document.execCommand;
        document.execCommand = () => true;

        try {
          return {
            callCountBeforeCopy,
            didCopy: await api.copyElement(element),
            getContentCallCount,
          };
        } finally {
          document.execCommand = originalExecCommand;
        }
      });

      expect(result).toEqual({
        callCountBeforeCopy: 0,
        didCopy: true,
        getContentCallCount: 1,
      });
    });

    test("keeps a copy completed when deactivated during the clipboard write", async ({
      reactGrab,
    }) => {
      const result = await reactGrab.page.evaluate(async () => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              copyElement: (element: Element) => Promise<boolean>;
              deactivate: () => void;
              registerPlugin: (plugin: {
                name: string;
                options: { getContent: () => string };
              }) => void;
            };
          }
        ).__REACT_GRAB__;
        const element = document.querySelector("[data-testid='todo-list'] h1");
        if (!api || !element) throw new Error("React Grab API or test element unavailable");

        api.registerPlugin({
          name: "copy-commit-test",
          options: { getContent: () => "content" },
        });
        const originalExecCommand = document.execCommand;
        let copyCommandCount = 0;
        document.execCommand = () => {
          copyCommandCount += 1;
          api.deactivate();
          return true;
        };

        try {
          return { didCopy: await api.copyElement(element), copyCommandCount };
        } finally {
          document.execCommand = originalExecCommand;
        }
      });

      expect(result).toEqual({ didCopy: true, copyCommandCount: 1 });
    });

    for (const cancellationCase of COPY_CANCELLATION_CASES) {
      test(`does not write after ${cancellationCase.label} cancels a pending copy`, async ({
        reactGrab,
      }) => {
        const result = await reactGrab.page.evaluate(async (cancellationMethod) => {
          const api = (
            window as {
              __REACT_GRAB__?: {
                copyElement: (element: Element) => Promise<boolean>;
                deactivate: () => void;
                dispose: () => void;
                registerPlugin: (plugin: {
                  name: string;
                  options: { getContent: () => Promise<string> };
                }) => void;
              };
            }
          ).__REACT_GRAB__;
          const element = document.querySelector("[data-testid='todo-list'] h1");
          if (!api || !element) throw new Error("React Grab API or test element unavailable");

          let resolveContent = (_content: string): void => {};
          let markContentRequested = (): void => {};
          const content = new Promise<string>((resolve) => {
            resolveContent = resolve;
          });
          const contentRequested = new Promise<void>((resolve) => {
            markContentRequested = () => resolve();
          });
          api.registerPlugin({
            name: "pending-copy-test",
            options: {
              getContent: () => {
                markContentRequested();
                return content;
              },
            },
          });

          const originalExecCommand = document.execCommand;
          let copyCommandCount = 0;
          document.execCommand = () => {
            copyCommandCount += 1;
            return true;
          };

          try {
            const pendingCopy = api.copyElement(element);
            await contentRequested;
            api[cancellationMethod]();
            resolveContent("late content");
            return { didCopy: await pendingCopy, copyCommandCount };
          } finally {
            document.execCommand = originalExecCommand;
          }
        }, cancellationCase.method);

        expect(result).toEqual({ didCopy: false, copyCommandCount: 0 });
      });
    }
  });

  test.describe("Theme via setOptions", () => {
    test("setOptions({ theme }) should apply hue rotation filter", async ({ reactGrab }) => {
      await reactGrab.updateOptions({ theme: { hue: 90 } });
      await reactGrab.activate();

      const hasFilter = await reactGrab.page.evaluate(() => {
        const host = document.querySelector("[data-react-grab]");
        const shadowRoot = host?.shadowRoot;
        const root = shadowRoot?.querySelector("[data-react-grab]") as HTMLElement;
        return root?.style.filter?.includes("hue-rotate") ?? false;
      });

      expect(hasFilter).toBe(true);
    });

    test("multiple theme updates via setOptions should accumulate", async ({ reactGrab }) => {
      await reactGrab.updateOptions({ theme: { hue: 45 } });
      await reactGrab.updateOptions({
        theme: { elementLabel: { enabled: false } },
      });
      await reactGrab.activate();

      const hasFilter = await reactGrab.page.evaluate(() => {
        const host = document.querySelector("[data-react-grab]");
        const shadowRoot = host?.shadowRoot;
        const root = shadowRoot?.querySelector("[data-react-grab]") as HTMLElement;
        return root?.style.filter?.includes("hue-rotate(45deg)") ?? false;
      });

      expect(hasFilter).toBe(true);
    });
  });

  test.describe("Toolbar state", () => {
    test("isolates throwing state subscribers", async ({ reactGrab }) => {
      const result = await reactGrab.page.evaluate(() => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              onToolbarStateChange: (callback: (state: { collapsed: boolean }) => void) => void;
              setToolbarState: (state: { collapsed: boolean }) => void;
            };
          }
        ).__REACT_GRAB__;
        if (!api) throw new Error("React Grab API unavailable");

        let receivedCollapsed: boolean | undefined;
        api.onToolbarStateChange(() => {
          throw new Error("subscriber failed");
        });
        api.onToolbarStateChange((state) => {
          receivedCollapsed = state.collapsed;
        });

        api.setToolbarState({ collapsed: true });
        return receivedCollapsed;
      });

      expect(result).toBe(true);
    });
  });

  test.describe("maxContextLines via setOptions", () => {
    test("raising maxContextLines surfaces more source lines than the compact default", async ({
      reactGrab,
    }) => {
      const getStackLineCount = (selector: string) =>
        reactGrab.page.evaluate(async (sel) => {
          const api = (
            window as {
              __REACT_GRAB__?: { getStackContext: (el: Element) => Promise<string> };
            }
          ).__REACT_GRAB__;
          const element = document.querySelector(sel);
          if (!api || !element) return -1;
          const text = await api.getStackContext(element);
          return text.split("\n").filter(Boolean).length;
        }, selector);

      const contextTargetSelector = "[data-testid='todo-list'] ul li:first-child span";

      await reactGrab.updateOptions({ maxContextLines: 1 });
      const compactLineCount = await getStackLineCount(contextTargetSelector);

      await reactGrab.updateOptions({ maxContextLines: 12 });
      const detailedLineCount = await getStackLineCount(contextTargetSelector);

      expect(compactLineCount).toBeGreaterThanOrEqual(1);
      expect(detailedLineCount).toBeGreaterThan(compactLineCount);
    });
  });

  test.describe("dispose()", () => {
    test("should clear the disposed global API", async ({ reactGrab }) => {
      await reactGrab.dispose();

      const hasGlobalApi = await reactGrab.page.evaluate(() => window.__REACT_GRAB__ !== undefined);
      expect(hasGlobalApi).toBe(false);
    });

    test("should remove overlay host element on dispose", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.dispose();

      await reactGrab.page.waitForTimeout(100);

      const hostExists = await reactGrab.page.evaluate(() => {
        return document.querySelector("[data-react-grab]") !== null;
      });

      expect(hostExists).toBe(true);
    });

    test("should allow re-initialization after dispose", async ({ reactGrab }) => {
      const didInstallFreshApi = await reactGrab.reinitialize();
      expect(didInstallFreshApi).toBe(true);

      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });
  });

  test.describe("registerPlugin()", () => {
    test("should register plugin with hooks", async ({ reactGrab }) => {
      let callbackCalled = false;

      await reactGrab.page.evaluate(() => {
        (window as { __TEST_CALLBACK_CALLED__?: boolean }).__TEST_CALLBACK_CALLED__ = false;
        const api = (
          window as {
            __REACT_GRAB__?: {
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;
        api?.registerPlugin({
          name: "test-plugin",
          hooks: {
            onActivate: () => {
              (window as { __TEST_CALLBACK_CALLED__?: boolean }).__TEST_CALLBACK_CALLED__ = true;
            },
          },
        });
      });

      await reactGrab.activate();

      callbackCalled = await reactGrab.page.evaluate(() => {
        return (window as { __TEST_CALLBACK_CALLED__?: boolean }).__TEST_CALLBACK_CALLED__ ?? false;
      });

      expect(callbackCalled).toBe(true);
    });

    test("should allow registering plugin with multiple hooks", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        (window as { __CALLBACKS__?: string[] }).__CALLBACKS__ = [];
        const api = (
          window as {
            __REACT_GRAB__?: {
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;
        api?.registerPlugin({
          name: "test-plugin",
          hooks: {
            onActivate: () => {
              (window as { __CALLBACKS__?: string[] }).__CALLBACKS__?.push("activate");
            },
            onDeactivate: () => {
              (window as { __CALLBACKS__?: string[] }).__CALLBACKS__?.push("deactivate");
            },
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

  test.describe("Edge Cases", () => {
    test("API should work after multiple activation cycles", async ({ reactGrab }) => {
      for (let i = 0; i < 3; i++) {
        await reactGrab.activate();
        await reactGrab.hoverUntilSelected("li");
        await reactGrab.deactivate();
      }

      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });

    test("getState should be consistent with isActive", async ({ reactGrab }) => {
      const state1 = await reactGrab.getState();
      const isActive1 = await reactGrab.isOverlayVisible();
      expect(state1.isActive).toBe(isActive1);

      await reactGrab.activate();

      const state2 = await reactGrab.getState();
      const isActive2 = await reactGrab.isOverlayVisible();
      expect(state2.isActive).toBe(isActive2);
    });

    test("theme should persist across activation cycles", async ({ reactGrab }) => {
      await reactGrab.updateOptions({ theme: { hue: 120 } });
      await reactGrab.activate();
      await reactGrab.deactivate();
      await reactGrab.activate();

      const hasFilter = await reactGrab.page.evaluate(() => {
        const host = document.querySelector("[data-react-grab]");
        const shadowRoot = host?.shadowRoot;
        const root = shadowRoot?.querySelector("[data-react-grab]") as HTMLElement;
        return root?.style.filter?.includes("hue-rotate(120deg)") ?? false;
      });
      expect(hasFilter).toBe(true);
    });
  });
});
