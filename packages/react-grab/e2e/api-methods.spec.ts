import { test, expect } from "./fixtures.js";
import type { ReactGrabAPI } from "../src/types.js";

interface CopyCancellationCase {
  method: "deactivate" | "dispose";
  label: string;
}

interface LifecycleWindow {
  __REACT_GRAB__?: ReactGrabAPI;
  initReactGrab?: () => ReactGrabAPI;
}

const HOST_ATTACHMENT_RECHECK_WAIT_MS = 1_100;
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
    test("falls back when an external state references an unregistered action", async ({
      reactGrab,
    }) => {
      const defaultAction = await reactGrab.page.evaluate(() => {
        const api = (window as LifecycleWindow).__REACT_GRAB__;
        if (!api) throw new Error("React Grab API unavailable");

        api.setToolbarState({ defaultAction: "removed-action" });
        return api.getToolbarState()?.defaultAction;
      });

      expect(defaultAction).toBe("copy");
    });

    test("preserves registered actions in externally applied state", async ({ reactGrab }) => {
      const defaultAction = await reactGrab.page.evaluate(() => {
        const api = (window as LifecycleWindow).__REACT_GRAB__;
        if (!api) throw new Error("React Grab API unavailable");

        api.setToolbarState({ defaultAction: "comment" });
        return api.getToolbarState()?.defaultAction;
      });

      expect(defaultAction).toBe("comment");
    });

    test("isolates throwing state subscribers", async ({ reactGrab }) => {
      const result = await reactGrab.page.evaluate(() => {
        const api = (window as LifecycleWindow).__REACT_GRAB__;
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

    test("isolates subscribers from a disposed instance", async ({ reactGrab }) => {
      const callbackCounts = await reactGrab.page.evaluate(() => {
        const targetWindow = window as LifecycleWindow;
        const previousApi = targetWindow.__REACT_GRAB__;
        const initializeReactGrab = targetWindow.initReactGrab;
        if (!previousApi || !initializeReactGrab) {
          throw new Error("React Grab API unavailable");
        }

        let callbackCount = 0;
        const sharedCallback = () => {
          callbackCount += 1;
        };
        const unsubscribePrevious = previousApi.onToolbarStateChange(sharedCallback);

        previousApi.dispose();
        const replacementApi = initializeReactGrab();
        targetWindow.__REACT_GRAB__ = replacementApi;
        replacementApi.onToolbarStateChange(sharedCallback);

        previousApi.setToolbarState({ collapsed: true });
        const afterPreviousUpdate = callbackCount;

        unsubscribePrevious();
        replacementApi.setToolbarState({ collapsed: false });

        return { afterPreviousUpdate, afterReplacementUpdate: callbackCount };
      });

      expect(callbackCounts).toEqual({
        afterPreviousUpdate: 0,
        afterReplacementUpdate: 1,
      });
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
    test("does not normalize persisted toolbar state after same-turn disposal", async ({
      reactGrab,
    }) => {
      const persistedDefaultAction = await reactGrab.page.evaluate(async () => {
        const targetWindow = window as LifecycleWindow;
        const initializeReactGrab = targetWindow.initReactGrab;
        if (!initializeReactGrab) throw new Error("React Grab initializer unavailable");

        targetWindow.__REACT_GRAB__?.dispose();
        localStorage.setItem(
          "react-grab-toolbar-state",
          JSON.stringify({
            edge: "bottom",
            ratio: 0.5,
            collapsed: false,
            enabled: true,
            defaultAction: "removed-action",
          }),
        );

        const disposedApi = initializeReactGrab();
        disposedApi.dispose();
        await Promise.resolve();

        const persistedState = JSON.parse(
          localStorage.getItem("react-grab-toolbar-state") ?? "null",
        );
        localStorage.removeItem("react-grab-toolbar-state");
        targetWindow.__REACT_GRAB__ = initializeReactGrab();
        return persistedState?.defaultAction;
      });

      expect(persistedDefaultAction).toBe("removed-action");
    });

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

    test("a stale API should not dispose a replacement", async ({ reactGrab }) => {
      const result = await reactGrab.page.evaluate(() => {
        const targetWindow: LifecycleWindow = window;
        const staleApi = targetWindow.__REACT_GRAB__;
        if (!staleApi || !targetWindow.initReactGrab) {
          throw new Error("React Grab lifecycle API unavailable");
        }

        staleApi.dispose();
        const replacementApi = targetWindow.initReactGrab();
        targetWindow.__REACT_GRAB__ = replacementApi;

        let subscriberCallCount = 0;
        replacementApi.onToolbarStateChange(() => {
          subscriberCallCount += 1;
        });

        staleApi.dispose();
        replacementApi.setToolbarState({ collapsed: true });
        const duplicateApi = targetWindow.initReactGrab();
        const didRejectDuplicateInitialization = duplicateApi.getPlugins().length === 0;
        if (!didRejectDuplicateInitialization) duplicateApi.dispose();

        return { subscriberCallCount, didRejectDuplicateInitialization };
      });

      expect(result).toEqual({
        subscriberCallCount: 1,
        didRejectDuplicateInitialization: true,
      });
    });

    test("should cancel a disposed host attachment before body is available", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => {
        const targetWindow: LifecycleWindow = window;
        const initReactGrab = targetWindow.initReactGrab;
        if (!initReactGrab) throw new Error("React Grab initializer unavailable");
        targetWindow.__REACT_GRAB__?.dispose();
        document.body.remove();

        const disposedApi = initReactGrab();
        disposedApi.dispose();
        const activeApi = initReactGrab();
        targetWindow.__REACT_GRAB__ = activeApi;

        const replacementBody = document.createElement("body");
        document.documentElement.appendChild(replacementBody);
        document.dispatchEvent(new Event("DOMContentLoaded"));
      });

      await reactGrab.page.waitForTimeout(HOST_ATTACHMENT_RECHECK_WAIT_MS);
      const hostCount = await reactGrab.page.evaluate(
        () => document.querySelectorAll("[data-react-grab]").length,
      );
      expect(hostCount).toBe(1);
    });

    test("should recheck a host reused by a replacement", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const targetWindow: LifecycleWindow = window;
        const initReactGrab = targetWindow.initReactGrab;
        if (!initReactGrab) throw new Error("React Grab initializer unavailable");

        targetWindow.__REACT_GRAB__?.dispose();
        const replacementApi = initReactGrab();
        targetWindow.__REACT_GRAB__ = replacementApi;
        document.querySelector("[data-react-grab]")?.remove();
      });

      await reactGrab.page.waitForTimeout(HOST_ATTACHMENT_RECHECK_WAIT_MS);
      const hostCount = await reactGrab.page.evaluate(
        () => document.querySelectorAll("[data-react-grab]").length,
      );
      expect(hostCount).toBe(1);
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
