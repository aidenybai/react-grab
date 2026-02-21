import { test, expect } from "./fixtures.js";

test.describe("Freeze Updates", () => {
  test.describe("State Freezing During Prompt Mode", () => {
    test("should freeze React state updates when in prompt mode", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 2000 });

      const getElementCount = async () => {
        return reactGrab.page.evaluate(() => {
          return document.querySelectorAll("[data-testid^='dynamic-element-']")
            .length;
        });
      };

      const initialCount = await getElementCount();
      expect(initialCount).toBeGreaterThan(0);

      await reactGrab.enterPromptMode("[data-testid='dynamic-element-1']");

      await reactGrab.page.evaluate(() => {
        const addButton = document.querySelector(
          "[data-testid='add-element-button']",
        ) as HTMLButtonElement;
        addButton?.click();
      });
      await reactGrab.page.waitForTimeout(100);

      const countDuringPromptMode = await getElementCount();
      expect(countDuringPromptMode).toBe(initialCount);

      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(200);

      const countAfterExit = await getElementCount();
      expect(countAfterExit).toBe(initialCount);
    });

    test("should freeze visibility toggle during prompt mode", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 2000 });

      const isToggleableVisible = async () => {
        return reactGrab.page.evaluate(() => {
          return (
            document.querySelector("[data-testid='toggleable-element']") !==
            null
          );
        });
      };

      const initiallyVisible = await isToggleableVisible();
      expect(initiallyVisible).toBe(true);

      await reactGrab.enterPromptMode("[data-testid='toggleable-element']");

      await reactGrab.page.evaluate(() => {
        const button = document.querySelector(
          "[data-testid='toggle-visibility-button']",
        ) as HTMLButtonElement;
        button?.click();
      });
      await reactGrab.page.waitForTimeout(100);

      const stillVisibleDuringPromptMode = await isToggleableVisible();
      expect(stillVisibleDuringPromptMode).toBe(true);

      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(200);

      const visibleAfterExit = await isToggleableVisible();
      expect(visibleAfterExit).toBe(true);
    });

    test("should allow state updates after exiting prompt mode", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 100 });

      const getElementCount = async () => {
        return reactGrab.page.evaluate(() => {
          return document.querySelectorAll("[data-testid^='dynamic-element-']")
            .length;
        });
      };

      await reactGrab.enterPromptMode("[data-testid='dynamic-element-1']");
      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(200);

      const countBefore = await getElementCount();

      await reactGrab.page.click("[data-testid='add-element-button']");
      await reactGrab.page.waitForTimeout(100);

      const countAfter = await getElementCount();
      expect(countAfter).toBe(countBefore + 1);
    });
  });

  test.describe("Multiple Freeze/Unfreeze Cycles", () => {
    test("should handle multiple prompt mode cycles correctly", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 100 });

      const getElementCount = async () => {
        return reactGrab.page.evaluate(() => {
          return document.querySelectorAll("[data-testid^='dynamic-element-']")
            .length;
        });
      };

      for (let i = 0; i < 2; i++) {
        const countBefore = await getElementCount();

        await reactGrab.enterPromptMode("[data-testid='dynamic-element-1']");
        await reactGrab.pressEscape();
        await reactGrab.page.waitForTimeout(500);

        await reactGrab.page.click("[data-testid='add-element-button']");
        await reactGrab.page.waitForTimeout(300);

        const countAfter = await getElementCount();
        expect(countAfter).toBe(countBefore + 1);
      }
    });

    test("should not leak frozen state after rapid activation cycles", async ({
      reactGrab,
    }) => {
      for (let i = 0; i < 5; i++) {
        await reactGrab.activate();
        await reactGrab.hoverElement("li:first-child");
        await reactGrab.page.waitForTimeout(50);
        await reactGrab.deactivate();
        await reactGrab.page.waitForTimeout(50);
      }

      const getElementCount = async () => {
        return reactGrab.page.evaluate(() => {
          return document.querySelectorAll("[data-testid^='dynamic-element-']")
            .length;
        });
      };

      const countBefore = await getElementCount();

      await reactGrab.page.click("[data-testid='add-element-button']");
      await reactGrab.page.waitForTimeout(100);

      const countAfter = await getElementCount();
      expect(countAfter).toBe(countBefore + 1);
    });
  });

  test.describe("Freeze State Consistency", () => {
    test("should maintain UI consistency during prompt mode", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 2000 });

      await reactGrab.enterPromptMode("[data-testid='dynamic-element-1']");

      const elementTextDuringFreeze = await reactGrab.page.evaluate(() => {
        const element = document.querySelector(
          "[data-testid='dynamic-element-1']",
        );
        return element?.textContent?.trim() ?? "";
      });

      expect(elementTextDuringFreeze).toContain("Dynamic Element 1");

      await reactGrab.pressEscape();
    });

    test("should unfreeze all components after exiting prompt mode", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 100 });

      await reactGrab.enterPromptMode("[data-testid='test-input']");
      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.page.fill("[data-testid='test-input']", "test value");
      const inputValue = await reactGrab.page.evaluate(() => {
        const input = document.querySelector(
          "[data-testid='test-input']",
        ) as HTMLInputElement;
        return input?.value ?? "";
      });

      expect(inputValue).toBe("test value");
    });

    test("should resume updates after deactivation", async ({ reactGrab }) => {
      const getElementCount = async () => {
        return reactGrab.page.evaluate(() => {
          return document.querySelectorAll("[data-testid^='dynamic-element-']")
            .length;
        });
      };

      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='dynamic-section']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.deactivate();

      const countBefore = await getElementCount();

      await reactGrab.page.click("[data-testid='add-element-button']");
      await reactGrab.page.waitForTimeout(100);

      const countAfter = await getElementCount();
      expect(countAfter).toBe(countBefore + 1);
    });
  });

  test.describe("Edge Cases", () => {
    test("should handle freeze when no React state is present", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 100 });

      await reactGrab.enterPromptMode("[data-testid='main-title']");

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(true);

      await reactGrab.pressEscape();
    });

    test("should handle deactivation during frozen state", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 2000 });

      await reactGrab.enterPromptMode("[data-testid='dynamic-element-1']");

      await reactGrab.deactivate();
      await reactGrab.page.waitForTimeout(200);

      const getElementCount = async () => {
        return reactGrab.page.evaluate(() => {
          return document.querySelectorAll("[data-testid^='dynamic-element-']")
            .length;
        });
      };

      const countBefore = await getElementCount();

      await reactGrab.page.click("[data-testid='add-element-button']");
      await reactGrab.page.waitForTimeout(100);

      const countAfter = await getElementCount();
      expect(countAfter).toBe(countBefore + 1);
    });

    test("should properly cleanup after multiple freeze operations", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 100 });

      for (let i = 0; i < 3; i++) {
        await reactGrab.enterPromptMode("[data-testid='dynamic-element-1']");
        await reactGrab.deactivate();
        await reactGrab.page.waitForTimeout(100);
      }

      const getElementCount = async () => {
        return reactGrab.page.evaluate(() => {
          return document.querySelectorAll("[data-testid^='dynamic-element-']")
            .length;
        });
      };

      const countBefore = await getElementCount();

      await reactGrab.page.click("[data-testid='add-element-button']");
      await reactGrab.page.waitForTimeout(100);

      const countAfter = await getElementCount();
      expect(countAfter).toBe(countBefore + 1);
    });
  });

  test.describe("Button Click Buffering", () => {
    test("should buffer multiple clicks during freeze and apply on unfreeze", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 100 });

      const getElementCount = async () => {
        return reactGrab.page.evaluate(() => {
          return document.querySelectorAll("[data-testid^='dynamic-element-']")
            .length;
        });
      };

      const countBefore = await getElementCount();

      await reactGrab.enterPromptMode("[data-testid='dynamic-element-1']");

      for (let clickIndex = 0; clickIndex < 3; clickIndex++) {
        await reactGrab.page.evaluate(() => {
          const addButton = document.querySelector(
            "[data-testid='add-element-button']",
          ) as HTMLButtonElement;
          addButton?.click();
        });
        await reactGrab.page.waitForTimeout(50);
      }

      const countDuringFreeze = await getElementCount();
      expect(countDuringFreeze).toBe(countBefore);

      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(300);

      const countAfterUnfreeze = await getElementCount();
      expect(countAfterUnfreeze).toBe(countBefore);
    });

    test("should not accumulate state incorrectly across freeze cycles", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 100 });

      const getElementCount = async () => {
        return reactGrab.page.evaluate(() => {
          return document.querySelectorAll("[data-testid^='dynamic-element-']")
            .length;
        });
      };

      const countBeforeFirstCycle = await getElementCount();

      await reactGrab.enterPromptMode("[data-testid='dynamic-element-1']");
      await reactGrab.page.evaluate(() => {
        const addButton = document.querySelector(
          "[data-testid='add-element-button']",
        ) as HTMLButtonElement;
        addButton?.click();
      });
      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(300);

      const countAfterFirstCycle = await getElementCount();
      expect(countAfterFirstCycle).toBe(countBeforeFirstCycle);

      await reactGrab.enterPromptMode("[data-testid='dynamic-element-1']");
      await reactGrab.page.evaluate(() => {
        const addButton = document.querySelector(
          "[data-testid='add-element-button']",
        ) as HTMLButtonElement;
        addButton?.click();
      });
      await reactGrab.pressEscape();
      await reactGrab.page.waitForTimeout(300);

      const countAfterSecondCycle = await getElementCount();
      expect(countAfterSecondCycle).toBe(countBeforeFirstCycle);
    });
  });
});
