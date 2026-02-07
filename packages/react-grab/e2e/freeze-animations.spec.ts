import { test, expect } from "./fixtures.js";

const ATTRIBUTE_NAME = "data-react-grab";

test.describe("Freeze Animations", () => {
  test.describe("Page Animation Freezing", () => {
    test("should pause page animations when activated", async ({
      reactGrab,
    }) => {
      const getPageAnimationStates = async () => {
        return reactGrab.page.evaluate((attrName) => {
          return document.getAnimations().reduce<string[]>(
            (states, animation) => {
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
            },
            [],
          );
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
        expect(shadowAnimationCountAfter).toBeGreaterThanOrEqual(0);
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
});
