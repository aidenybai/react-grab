import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures.js";

const ATTRIBUTE_NAME = "data-react-grab";

interface FakeGsapTickLoopConfig {
  windowKey: string;
  restartOnWake: boolean;
}

const injectFakeGsapTickLoop = async (
  page: Page,
  config: FakeGsapTickLoopConfig,
): Promise<void> => {
  await page.addInitScript(
    ({
      windowKey,
      restartOnWake,
    }: {
      windowKey: string;
      restartOnWake: boolean;
    }) => {
      const nativeRaf = window.requestAnimationFrame.bind(window);
      let tickerRunning = true;
      let tickLoopId: number | null = null;

      const incrementTickCount = (): void => {
        (window as unknown as Record<string, number>).__GSAP_TICK_COUNT__ =
          ((window as unknown as Record<string, number>).__GSAP_TICK_COUNT__ ??
            0) + 1;
      };

      // HACK: function named _tick simulates GSAP's internal tick,
      // detected via stack trace inspection in the rAF wrapper
      const runTickLoop = (): void => {
        const _tick = (): void => {
          if (!tickerRunning) return;
          incrementTickCount();
          tickLoopId = nativeRaf(_tick);
        };
        tickLoopId = nativeRaf(_tick);
      };

      const fakeGsap = {
        ticker: {
          sleep: () => {
            tickerRunning = false;
            if (tickLoopId !== null) {
              window.cancelAnimationFrame(tickLoopId);
              tickLoopId = null;
            }
          },
          wake: () => {
            tickerRunning = true;
            if (restartOnWake && tickLoopId === null) {
              runTickLoop();
            }
          },
        },
        globalTimeline: {
          pause: () => {},
          resume: () => {},
        },
      };

      (window as unknown as Record<string, unknown>)[windowKey] = fakeGsap;
      runTickLoop();
    },
    config,
  );
};

const navigateAndWaitForReactGrab = async (page: Page): Promise<void> => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      (window as { __REACT_GRAB__?: unknown }).__REACT_GRAB__ !== undefined,
    { timeout: 10000 },
  );
};

const getTickCount = (page: Page): Promise<number> =>
  page.evaluate(
    () =>
      (window as unknown as Record<string, number>).__GSAP_TICK_COUNT__ ?? 0,
  );

const activateViaApi = (page: Page): Promise<void> =>
  page.evaluate(() => {
    (
      window as unknown as { __REACT_GRAB__: { activate: () => void } }
    ).__REACT_GRAB__.activate();
  });

const deactivateViaApi = (page: Page): Promise<void> =>
  page.evaluate(() => {
    (
      window as unknown as { __REACT_GRAB__: { deactivate: () => void } }
    ).__REACT_GRAB__.deactivate();
  });

test.describe("Freeze Animations", () => {
  test.describe("Page Animation Freezing", () => {
    test("should pause page animations when activated", async ({
      reactGrab,
    }) => {
      const getPageAnimationStates = async () => {
        return reactGrab.page.evaluate((attrName) => {
          return document
            .getAnimations()
            .reduce<string[]>((states, animation) => {
              if (animation.effect instanceof KeyframeEffect) {
                const target = animation.effect.target;
                if (target instanceof Element) {
                  const rootNode = target.getRootNode();
                  if (
                    rootNode instanceof ShadowRoot &&
                    rootNode.host.hasAttribute(attrName)
                  ) {
                    return states;
                  }
                }
              }
              states.push(animation.playState);
              return states;
            }, []);
        }, ATTRIBUTE_NAME);
      };

      const statesBefore = await getPageAnimationStates();
      expect(statesBefore.length).toBeGreaterThan(0);
      expect(statesBefore.every((state) => state === "running")).toBe(true);

      await reactGrab.activate();
      await reactGrab.page.waitForTimeout(100);

      const statesDuring = await getPageAnimationStates();
      expect(statesDuring.every((state) => state === "paused")).toBe(true);
    });

    test("should not leave page animations in paused state after deactivation", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(100);

      const pausedPageAnimationCount = await reactGrab.page.evaluate(
        (attrName) => {
          return document.getAnimations().filter((animation) => {
            if (animation.effect instanceof KeyframeEffect) {
              const target = animation.effect.target;
              if (target instanceof Element) {
                const rootNode = target.getRootNode();
                if (
                  rootNode instanceof ShadowRoot &&
                  rootNode.host.hasAttribute(attrName)
                ) {
                  return false;
                }
              }
            }
            return animation.playState === "paused";
          }).length;
        },
        ATTRIBUTE_NAME,
      );

      expect(pausedPageAnimationCount).toBe(0);
    });

    test("should not leave global freeze style element in document after deactivation", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.page.waitForTimeout(100);

      const hasFreezeStyleDuring = await reactGrab.page.evaluate(() => {
        return (
          document.querySelector("[data-react-grab-global-freeze]") !== null
        );
      });
      expect(hasFreezeStyleDuring).toBe(true);

      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(100);

      const hasFreezeStyleAfter = await reactGrab.page.evaluate(() => {
        return (
          document.querySelector("[data-react-grab-global-freeze]") !== null
        );
      });
      expect(hasFreezeStyleAfter).toBe(false);
    });
  });

  test.describe("React Grab UI Preservation", () => {
    test("should not finish react-grab shadow DOM animations on deactivation", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.page.waitForTimeout(200);

      const shadowAnimationCountBefore = await reactGrab.page.evaluate(
        (attrName) => {
          return document.getAnimations().filter((animation) => {
            if (animation.effect instanceof KeyframeEffect) {
              const target = animation.effect.target;
              if (target instanceof Element) {
                const rootNode = target.getRootNode();
                return (
                  rootNode instanceof ShadowRoot &&
                  rootNode.host.hasAttribute(attrName)
                );
              }
            }
            return false;
          }).length;
        },
        ATTRIBUTE_NAME,
      );

      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(100);

      const shadowAnimationCountAfter = await reactGrab.page.evaluate(
        (attrName) => {
          return document.getAnimations().filter((animation) => {
            if (animation.effect instanceof KeyframeEffect) {
              const target = animation.effect.target;
              if (target instanceof Element) {
                const rootNode = target.getRootNode();
                return (
                  rootNode instanceof ShadowRoot &&
                  rootNode.host.hasAttribute(attrName)
                );
              }
            }
            return false;
          }).length;
        },
        ATTRIBUTE_NAME,
      );

      if (shadowAnimationCountBefore > 0) {
        expect(shadowAnimationCountAfter).toBe(shadowAnimationCountBefore);
      }
    });

    test("toolbar should remain visible after activation cycle", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      await reactGrab.activate();
      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(200);

      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);
    });

    test("toolbar should remain functional after activation cycle", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.clickToolbarToggle();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.clickToolbarToggle();
      expect(await reactGrab.isOverlayVisible()).toBe(false);
    });

    test("selection label should be visible during hover after prior activation cycle", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.waitForSelectionLabel();

      const labelInfo = await reactGrab.getSelectionLabelInfo();
      expect(labelInfo.isVisible).toBe(true);
    });
  });

  test.describe("Freeze/Unfreeze Cycles", () => {
    test("should handle rapid activation cycles without breaking animations", async ({
      reactGrab,
    }) => {
      for (let iteration = 0; iteration < 5; iteration++) {
        await reactGrab.activate();
        await reactGrab.page.waitForTimeout(50);
        await reactGrab.deactivate();
        await reactGrab.page.waitForTimeout(50);
      }

      const hasFreezeStyle = await reactGrab.page.evaluate(() => {
        return (
          document.querySelector("[data-react-grab-global-freeze]") !== null
        );
      });
      expect(hasFreezeStyle).toBe(false);

      const toolbarVisible = await reactGrab.isToolbarVisible();
      expect(toolbarVisible).toBe(true);
    });

    test("should correctly freeze animations after reactivation", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.page.evaluate(() => {
        const element = document.querySelector(
          "[data-testid='animated-section']",
        );
        if (element) {
          const child = document.createElement("div");
          child.className = "animate-ping w-4 h-4 bg-yellow-500 rounded-full";
          child.setAttribute("data-testid", "injected-animation");
          element.appendChild(child);
        }
      });
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.activate();
      await reactGrab.page.waitForTimeout(100);

      const pausedAnimationCount = await reactGrab.page.evaluate((attrName) => {
        return document.getAnimations().filter((animation) => {
          if (animation.effect instanceof KeyframeEffect) {
            const target = animation.effect.target;
            if (target instanceof Element) {
              const rootNode = target.getRootNode();
              if (
                rootNode instanceof ShadowRoot &&
                rootNode.host.hasAttribute(attrName)
              ) {
                return false;
              }
            }
          }
          return animation.playState === "paused";
        }).length;
      }, ATTRIBUTE_NAME);

      expect(pausedAnimationCount).toBeGreaterThan(0);

      await reactGrab.deactivate();
    });

    test("should not leave stale freeze styles after toolbar hover cycle", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(200);

      const hasFreezeStyle = await reactGrab.page.evaluate(() => {
        return (
          document.querySelector("[data-react-grab-global-freeze]") !== null
        );
      });
      expect(hasFreezeStyle).toBe(false);
    });
  });

  test.describe("Toolbar Hover Freeze", () => {
    test("should clean up freeze styles after toolbar hover cycle", async ({
      reactGrab,
    }) => {
      await expect
        .poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 })
        .toBe(true);

      const toolbarInfo = await reactGrab.getToolbarInfo();

      if (toolbarInfo.position) {
        await reactGrab.page.mouse.move(
          toolbarInfo.position.x + 10,
          toolbarInfo.position.y + 10,
        );
        await reactGrab.page.waitForTimeout(200);
      }

      await reactGrab.page.mouse.move(0, 0);
      await reactGrab.page.waitForTimeout(200);

      const hasFreezeStyle = await reactGrab.page.evaluate(() => {
        return (
          document.querySelector("[data-react-grab-global-freeze]") !== null
        );
      });
      expect(hasFreezeStyle).toBe(false);
    });
  });

  test.describe("rAF Interception", () => {
    test("should wrap window.requestAnimationFrame and cancelAnimationFrame", async ({
      reactGrab,
    }) => {
      const isWrapped = await reactGrab.page.evaluate(() => {
        const rafSource = window.requestAnimationFrame.toString();
        const cafSource = window.cancelAnimationFrame.toString();
        return (
          !rafSource.includes("[native code]") &&
          !cafSource.includes("[native code]")
        );
      });
      expect(isWrapped).toBe(true);
    });

    test("should execute non-animation rAF callbacks during freeze", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.page.waitForTimeout(100);

      const didCallbackExecute = await reactGrab.page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          window.requestAnimationFrame(() => resolve(true));
          setTimeout(() => resolve(false), 1000);
        });
      });

      expect(didCallbackExecute).toBe(true);
    });

    test("should hold animation library callbacks during freeze", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.page.waitForTimeout(100);

      const wasCallbackHeld = await reactGrab.page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          // HACK: function named _tick simulates GSAP's internal tick,
          // detected via stack trace inspection in the rAF wrapper
          const _tick = () => {
            let didExecute = false;
            window.requestAnimationFrame(() => {
              didExecute = true;
            });
            setTimeout(() => resolve(!didExecute), 200);
          };
          _tick();
        });
      });

      expect(wasCallbackHeld).toBe(true);
    });

    test("should release held callbacks after unfreeze", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.page.evaluate(() => {
        (window as unknown as Record<string, boolean>).__GSAP_TEST_FLAG__ =
          false;
        // HACK: function named _tick simulates GSAP's internal tick,
        // detected via stack trace inspection in the rAF wrapper
        const _tick = () => {
          window.requestAnimationFrame(() => {
            (window as unknown as Record<string, boolean>).__GSAP_TEST_FLAG__ =
              true;
          });
        };
        _tick();
      });

      await reactGrab.page.waitForTimeout(100);
      const wasHeldDuringFreeze = await reactGrab.page.evaluate(
        () =>
          !(window as unknown as Record<string, boolean>).__GSAP_TEST_FLAG__,
      );
      expect(wasHeldDuringFreeze).toBe(true);

      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(200);

      const wasReleasedAfterUnfreeze = await reactGrab.page.evaluate(
        () => (window as unknown as Record<string, boolean>).__GSAP_TEST_FLAG__,
      );
      expect(wasReleasedAfterUnfreeze).toBe(true);
    });

    test("should cancel held callbacks via cancelAnimationFrame", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.page.waitForTimeout(100);

      const wasCancelledWhileHeld = await reactGrab.page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          let frameIdentifier: number;
          // HACK: function named _tick simulates GSAP's internal tick,
          // detected via stack trace inspection in the rAF wrapper
          const _tick = () => {
            frameIdentifier = window.requestAnimationFrame(() => {
              resolve(false);
            });
          };
          _tick();
          window.cancelAnimationFrame(frameIdentifier!);
          setTimeout(() => resolve(true), 200);
        });
      });

      expect(wasCancelledWhileHeld).toBe(true);
    });

    test("should not intercept callbacks after unfreeze", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.page.waitForTimeout(100);
      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(100);

      const didCallbackExecuteNormally = await reactGrab.page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          // HACK: function named _tick simulates GSAP's internal tick,
          // detected via stack trace inspection in the rAF wrapper
          const _tick = () => {
            window.requestAnimationFrame(() => resolve(true));
          };
          _tick();
          setTimeout(() => resolve(false), 1000);
        });
      });

      expect(didCallbackExecuteNormally).toBe(true);
    });
  });

  test.describe("GSAP Late-Load Interception", () => {
    test("should freeze GSAP via direct instance pause when GSAP loaded before react-grab", async ({
      page,
    }) => {
      await injectFakeGsapTickLoop(page, {
        windowKey: "gsap",
        restartOnWake: false,
      });
      await navigateAndWaitForReactGrab(page);

      const tickCountBeforeFreeze = await getTickCount(page);
      expect(tickCountBeforeFreeze).toBeGreaterThan(0);

      await activateViaApi(page);
      await page.waitForTimeout(200);

      const tickCountAtFreeze = await getTickCount(page);
      await page.waitForTimeout(300);
      const tickCountAfterWaiting = await getTickCount(page);

      expect(tickCountAfterWaiting).toBe(tickCountAtFreeze);
    });

    test("should resume GSAP tick loop after unfreeze", async ({ page }) => {
      await injectFakeGsapTickLoop(page, {
        windowKey: "gsap",
        restartOnWake: true,
      });
      await navigateAndWaitForReactGrab(page);

      await activateViaApi(page);
      await page.waitForTimeout(200);

      await deactivateViaApi(page);
      await page.waitForTimeout(100);

      const tickCountAfterUnfreeze = await getTickCount(page);
      await page.waitForTimeout(300);
      const tickCountLater = await getTickCount(page);

      expect(tickCountLater).toBeGreaterThan(tickCountAfterUnfreeze);
    });

    test("should freeze registered GSAP instance (ESM builds without window.gsap)", async ({
      page,
    }) => {
      await injectFakeGsapTickLoop(page, {
        windowKey: "__ESM_GSAP_INSTANCE__",
        restartOnWake: true,
      });
      await navigateAndWaitForReactGrab(page);

      await page.evaluate(() => {
        const api = (window as unknown as Record<string, unknown>)
          .__REACT_GRAB__ as { registerGsap: (instance: unknown) => void };
        const gsapInstance = (window as unknown as Record<string, unknown>)
          .__ESM_GSAP_INSTANCE__;
        api.registerGsap(gsapInstance);
      });

      await activateViaApi(page);
      await page.waitForTimeout(200);

      const tickCountAtFreeze = await getTickCount(page);
      await page.waitForTimeout(300);
      const tickCountAfterWaiting = await getTickCount(page);

      expect(tickCountAfterWaiting).toBe(tickCountAtFreeze);
    });
  });
});
