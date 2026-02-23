import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures.js";

const ATTRIBUTE_NAME = "data-react-grab";

const simulateGsapPresence = (page: Page): Promise<void> =>
  page.evaluate(() => {
    (window as unknown as Record<string, string[]>).gsapVersions = ["3.12.0"];
  });

const navigateAndWaitForReactGrab = async (page: Page): Promise<void> => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      (window as { __REACT_GRAB__?: unknown }).__REACT_GRAB__ !== undefined,
    { timeout: 10000 },
  );
};

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
      await simulateGsapPresence(reactGrab.page);
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
      await simulateGsapPresence(reactGrab.page);
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
      await simulateGsapPresence(reactGrab.page);
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

    test("should cancel held callbacks across evaluate calls via returned id", async ({
      reactGrab,
    }) => {
      await simulateGsapPresence(reactGrab.page);
      await reactGrab.activate();
      await reactGrab.page.waitForTimeout(100);

      const heldId = await reactGrab.page.evaluate(() => {
        (window as unknown as Record<string, boolean>).__RACE_CANCEL_FLAG__ =
          false;
        let capturedId: number;
        // HACK: function named _tick simulates GSAP's internal tick,
        // detected via stack trace inspection in the rAF wrapper
        const _tick = () => {
          capturedId = window.requestAnimationFrame(() => {
            (
              window as unknown as Record<string, boolean>
            ).__RACE_CANCEL_FLAG__ = true;
          });
        };
        _tick();
        return capturedId!;
      });

      await reactGrab.page.waitForTimeout(100);

      await reactGrab.page.evaluate((identifier: number) => {
        window.cancelAnimationFrame(identifier);
      }, heldId);

      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(200);

      const didCallbackRun = await reactGrab.page.evaluate(
        () =>
          (window as unknown as Record<string, boolean>).__RACE_CANCEL_FLAG__,
      );
      expect(didCallbackRun).toBe(false);
    });

    test("should cancel replayed callbacks via fake id after unfreeze", async ({
      page,
    }) => {
      await navigateAndWaitForReactGrab(page);
      await simulateGsapPresence(page);
      await activateViaApi(page);
      await page.waitForTimeout(100);

      const heldId = await page.evaluate(() => {
        (
          window as unknown as Record<string, boolean>
        ).__POST_UNFREEZE_CANCEL_FLAG__ = false;
        let capturedId: number;
        // HACK: function named _tick simulates GSAP's internal tick,
        // detected via stack trace inspection in the rAF wrapper
        const _tick = () => {
          capturedId = window.requestAnimationFrame(() => {
            (
              window as unknown as Record<string, boolean>
            ).__POST_UNFREEZE_CANCEL_FLAG__ = true;
          });
        };
        _tick();
        return capturedId!;
      });

      // HACK: Deactivate and cancel in the same evaluate to prevent the
      // replayed rAF callback from firing between the two round-trips
      await page.evaluate((identifier: number) => {
        (
          window as unknown as { __REACT_GRAB__: { deactivate: () => void } }
        ).__REACT_GRAB__.deactivate();
        window.cancelAnimationFrame(identifier);
      }, heldId);

      await page.waitForTimeout(200);

      const didCallbackRun = await page.evaluate(
        () =>
          (window as unknown as Record<string, boolean>)
            .__POST_UNFREEZE_CANCEL_FLAG__,
      );
      expect(didCallbackRun).toBe(false);
    });

    test("should not intercept callbacks after unfreeze", async ({
      reactGrab,
    }) => {
      await simulateGsapPresence(reactGrab.page);
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

  test.describe("rAF Tick Loop Interception (ESM without window.gsap)", () => {
    test("should stop a _tick loop scheduled before freeze via rAF guard", async ({
      page,
    }) => {
      await navigateAndWaitForReactGrab(page);
      await simulateGsapPresence(page);

      await page.evaluate(() => {
        (window as unknown as Record<string, number>).__RAF_TICK_COUNT__ = 0;
        // HACK: function named _tick simulates GSAP's internal tick,
        // detected via stack trace inspection in the rAF wrapper
        const _tick = (): void => {
          (window as unknown as Record<string, number>).__RAF_TICK_COUNT__++;
          window.requestAnimationFrame(_tick);
        };
        window.requestAnimationFrame(_tick);
      });

      await page.waitForTimeout(200);
      const tickCountBeforeFreeze = await page.evaluate(
        () =>
          (window as unknown as Record<string, number>).__RAF_TICK_COUNT__,
      );
      expect(tickCountBeforeFreeze).toBeGreaterThan(0);

      await activateViaApi(page);
      await page.waitForTimeout(200);

      const tickCountAtFreeze = await page.evaluate(
        () =>
          (window as unknown as Record<string, number>).__RAF_TICK_COUNT__,
      );
      await page.waitForTimeout(300);
      const tickCountAfterWaiting = await page.evaluate(
        () =>
          (window as unknown as Record<string, number>).__RAF_TICK_COUNT__,
      );

      expect(tickCountAfterWaiting).toBe(tickCountAtFreeze);
    });

    test("should resume _tick loop after unfreeze", async ({ page }) => {
      await navigateAndWaitForReactGrab(page);
      await simulateGsapPresence(page);

      await page.evaluate(() => {
        (window as unknown as Record<string, number>).__RAF_TICK_COUNT__ = 0;
        // HACK: function named _tick simulates GSAP's internal tick,
        // detected via stack trace inspection in the rAF wrapper
        const _tick = (): void => {
          (window as unknown as Record<string, number>).__RAF_TICK_COUNT__++;
          window.requestAnimationFrame(_tick);
        };
        window.requestAnimationFrame(_tick);
      });

      await page.waitForTimeout(200);
      await activateViaApi(page);
      await page.waitForTimeout(200);
      await deactivateViaApi(page);
      await page.waitForTimeout(100);

      const tickCountAfterUnfreeze = await page.evaluate(
        () =>
          (window as unknown as Record<string, number>).__RAF_TICK_COUNT__,
      );
      await page.waitForTimeout(300);
      const tickCountLater = await page.evaluate(
        () =>
          (window as unknown as Record<string, number>).__RAF_TICK_COUNT__,
      );

      expect(tickCountLater).toBeGreaterThan(tickCountAfterUnfreeze);
    });
  });

});
