import { test, expect } from "./fixtures.js";
import type { ReactGrabPageObject } from "./fixtures.js";

const POSITION_TOLERANCE_PX = 3;
const TOGGLE_ANIMATION_SETTLE_MS = 300;

const getToggleButtonCenter = async (reactGrab: ReactGrabPageObject) => {
  return reactGrab.page.evaluate((attrName) => {
    const host = document.querySelector(`[${attrName}]`);
    const shadowRoot = host?.shadowRoot;
    if (!shadowRoot) return null;
    const root = shadowRoot.querySelector(`[${attrName}]`);
    if (!root) return null;
    const button = root.querySelector<HTMLButtonElement>(
      "[data-react-grab-toolbar-enabled]",
    );
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }, "data-react-grab");
};

const seedToolbarEdge = async (
  page: import("@playwright/test").Page,
  edge: "top" | "bottom" | "left" | "right",
  enabled = true,
) => {
  await page.evaluate(
    ({ edge: savedEdge, enabled: savedEnabled }) => {
      localStorage.setItem(
        "react-grab-toolbar-state",
        JSON.stringify({
          edge: savedEdge,
          ratio: 0.5,
          collapsed: false,
          enabled: savedEnabled,
        }),
      );
    },
    { edge, enabled },
  );
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
};

const copyElement = async (
  reactGrab: ReactGrabPageObject,
  selector: string,
) => {
  await reactGrab.activate();
  await reactGrab.hoverElement(selector);
  await reactGrab.waitForSelectionBox();
  await reactGrab.clickElement(selector);
  await expect
    .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
    .toBeTruthy();
  // HACK: Wait for copy feedback transition and history item addition
  await reactGrab.page.waitForTimeout(300);
};

const expectPositionStable = (
  beforePosition: { x: number; y: number },
  afterPosition: { x: number; y: number },
) => {
  expect(Math.abs(afterPosition.x - beforePosition.x)).toBeLessThan(
    POSITION_TOLERANCE_PX,
  );
  expect(Math.abs(afterPosition.y - beforePosition.y)).toBeLessThan(
    POSITION_TOLERANCE_PX,
  );
};

const waitForToolbarReady = async (reactGrab: ReactGrabPageObject) => {
  await expect
    .poll(() => reactGrab.isToolbarVisible(), { timeout: 3000 })
    .toBe(true);
  // HACK: Wait for toolbar fade-in animation to complete
  await reactGrab.page.waitForTimeout(600);
};

test.describe("Toggle Position Stability", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => {
      localStorage.removeItem("react-grab-toolbar-state");
    });
    await reactGrab.page.reload();
    await reactGrab.page.waitForLoadState("domcontentloaded");
    await waitForToolbarReady(reactGrab);
  });

  test.describe("Horizontal Layout", () => {
    test("toggle should stay in place when disabling on bottom edge", async ({
      reactGrab,
    }) => {
      const beforeToggle = await getToggleButtonCenter(reactGrab);
      expect(beforeToggle).not.toBeNull();

      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);

      const afterToggle = await getToggleButtonCenter(reactGrab);
      expect(afterToggle).not.toBeNull();
      expectPositionStable(beforeToggle!, afterToggle!);
    });

    test("toggle should stay in place when re-enabling on bottom edge", async ({
      reactGrab,
    }) => {
      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);

      const beforeReEnable = await getToggleButtonCenter(reactGrab);
      expect(beforeReEnable).not.toBeNull();

      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);

      const afterReEnable = await getToggleButtonCenter(reactGrab);
      expect(afterReEnable).not.toBeNull();
      expectPositionStable(beforeReEnable!, afterReEnable!);
    });

    test("toggle should return to same position after full cycle on bottom edge", async ({
      reactGrab,
    }) => {
      const initialPosition = await getToggleButtonCenter(reactGrab);
      expect(initialPosition).not.toBeNull();

      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);
      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);

      const afterCycle = await getToggleButtonCenter(reactGrab);
      expect(afterCycle).not.toBeNull();
      expectPositionStable(initialPosition!, afterCycle!);
    });

    test("toggle should stay in place when toggling on top edge", async ({
      reactGrab,
    }) => {
      await seedToolbarEdge(reactGrab.page, "top");
      await waitForToolbarReady(reactGrab);

      const beforeToggle = await getToggleButtonCenter(reactGrab);
      expect(beforeToggle).not.toBeNull();

      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);

      const afterToggle = await getToggleButtonCenter(reactGrab);
      expect(afterToggle).not.toBeNull();
      expectPositionStable(beforeToggle!, afterToggle!);
    });
  });

  test.describe("Vertical Layout", () => {
    test("toggle should stay in place when toggling on right edge", async ({
      reactGrab,
    }) => {
      await seedToolbarEdge(reactGrab.page, "right");
      await waitForToolbarReady(reactGrab);

      const beforeToggle = await getToggleButtonCenter(reactGrab);
      expect(beforeToggle).not.toBeNull();

      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);

      const afterToggle = await getToggleButtonCenter(reactGrab);
      expect(afterToggle).not.toBeNull();
      expectPositionStable(beforeToggle!, afterToggle!);
    });

    test("toggle should stay in place when toggling on left edge", async ({
      reactGrab,
    }) => {
      await seedToolbarEdge(reactGrab.page, "left");
      await waitForToolbarReady(reactGrab);

      const beforeToggle = await getToggleButtonCenter(reactGrab);
      expect(beforeToggle).not.toBeNull();

      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);

      const afterToggle = await getToggleButtonCenter(reactGrab);
      expect(afterToggle).not.toBeNull();
      expectPositionStable(beforeToggle!, afterToggle!);
    });
  });

  test.describe("First Enable", () => {
    test("first enable on bottom edge should not cause position jump", async ({
      reactGrab,
    }) => {
      await seedToolbarEdge(reactGrab.page, "bottom", false);
      await waitForToolbarReady(reactGrab);

      const beforeFirstEnable = await getToggleButtonCenter(reactGrab);
      expect(beforeFirstEnable).not.toBeNull();

      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);

      const afterFirstEnable = await getToggleButtonCenter(reactGrab);
      expect(afterFirstEnable).not.toBeNull();
      expectPositionStable(beforeFirstEnable!, afterFirstEnable!);
    });

    test("first enable on top edge should not cause position jump", async ({
      reactGrab,
    }) => {
      await seedToolbarEdge(reactGrab.page, "top", false);
      await waitForToolbarReady(reactGrab);

      const beforeFirstEnable = await getToggleButtonCenter(reactGrab);
      expect(beforeFirstEnable).not.toBeNull();

      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);

      const afterFirstEnable = await getToggleButtonCenter(reactGrab);
      expect(afterFirstEnable).not.toBeNull();
      expectPositionStable(beforeFirstEnable!, afterFirstEnable!);
    });
  });

  test.describe("Position Drift Prevention", () => {
    test("should not drift after history button appears then disappears", async ({
      reactGrab,
    }) => {
      await copyElement(reactGrab, "li:first-child");
      await expect
        .poll(() => reactGrab.isHistoryButtonVisible(), { timeout: 2000 })
        .toBe(true);

      const withHistoryPosition = await getToggleButtonCenter(reactGrab);
      expect(withHistoryPosition).not.toBeNull();

      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);
      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);

      const afterCycleWithHistory = await getToggleButtonCenter(reactGrab);
      expect(afterCycleWithHistory).not.toBeNull();
      expectPositionStable(withHistoryPosition!, afterCycleWithHistory!);

      await reactGrab.clickHistoryButton();
      await reactGrab.clickHistoryClear();
      await expect
        .poll(() => reactGrab.isHistoryButtonVisible(), { timeout: 2000 })
        .toBe(false);
      // HACK: Wait for history button hide animation
      await reactGrab.page.waitForTimeout(200);

      const withoutHistoryPosition = await getToggleButtonCenter(reactGrab);
      expect(withoutHistoryPosition).not.toBeNull();

      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);
      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);

      const afterCycleWithoutHistory = await getToggleButtonCenter(reactGrab);
      expect(afterCycleWithoutHistory).not.toBeNull();
      expectPositionStable(withoutHistoryPosition!, afterCycleWithoutHistory!);
    });

    test("should not accumulate drift over multiple toggle cycles", async ({
      reactGrab,
    }) => {
      const initialPosition = await getToggleButtonCenter(reactGrab);
      expect(initialPosition).not.toBeNull();

      for (let cycleIndex = 0; cycleIndex < 5; cycleIndex++) {
        await reactGrab.clickToolbarEnabled();
        // HACK: Wait for toggle animation to settle
        await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);
        await reactGrab.clickToolbarEnabled();
        // HACK: Wait for toggle animation to settle
        await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);
      }

      const finalPosition = await getToggleButtonCenter(reactGrab);
      expect(finalPosition).not.toBeNull();
      expectPositionStable(initialPosition!, finalPosition!);
    });

    test("should not drift on vertical edge after history changes", async ({
      reactGrab,
    }) => {
      await seedToolbarEdge(reactGrab.page, "right");
      await waitForToolbarReady(reactGrab);

      await copyElement(reactGrab, "li:first-child");
      await expect
        .poll(() => reactGrab.isHistoryButtonVisible(), { timeout: 2000 })
        .toBe(true);

      const beforeCyclePosition = await getToggleButtonCenter(reactGrab);
      expect(beforeCyclePosition).not.toBeNull();

      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);
      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);

      const afterCyclePosition = await getToggleButtonCenter(reactGrab);
      expect(afterCyclePosition).not.toBeNull();
      expectPositionStable(beforeCyclePosition!, afterCyclePosition!);

      await reactGrab.clickHistoryButton();
      await reactGrab.clickHistoryClear();
      await expect
        .poll(() => reactGrab.isHistoryButtonVisible(), { timeout: 2000 })
        .toBe(false);
      // HACK: Wait for history button hide animation
      await reactGrab.page.waitForTimeout(200);

      const afterClearPosition = await getToggleButtonCenter(reactGrab);
      expect(afterClearPosition).not.toBeNull();

      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);
      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);

      const afterClearCyclePosition = await getToggleButtonCenter(reactGrab);
      expect(afterClearCyclePosition).not.toBeNull();
      expectPositionStable(afterClearPosition!, afterClearCyclePosition!);
    });
  });

  test.describe("Rapid Toggle", () => {
    test("rapid toggles should maintain toolbar visibility and state", async ({
      reactGrab,
    }) => {
      for (let toggleIndex = 0; toggleIndex < 6; toggleIndex++) {
        await reactGrab.clickToolbarEnabled();
        // HACK: Brief pause between rapid toggles
        await reactGrab.page.waitForTimeout(50);
      }

      // HACK: Wait for all toggle animations to fully settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS * 2);

      const toolbarInfo = await reactGrab.getToolbarInfo();
      expect(toolbarInfo.isVisible).toBe(true);
      expect(toolbarInfo.position).not.toBeNull();

      const togglePosition = await getToggleButtonCenter(reactGrab);
      expect(togglePosition).not.toBeNull();
    });

    test("position should stabilize after rapid toggles settle", async ({
      reactGrab,
    }) => {
      for (let toggleIndex = 0; toggleIndex < 6; toggleIndex++) {
        await reactGrab.clickToolbarEnabled();
        // HACK: Brief pause between rapid toggles
        await reactGrab.page.waitForTimeout(50);
      }

      // HACK: Wait for all toggle animations to fully settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS * 2);

      const settledPosition = await getToggleButtonCenter(reactGrab);
      expect(settledPosition).not.toBeNull();

      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);
      await reactGrab.clickToolbarEnabled();
      // HACK: Wait for toggle animation to settle
      await reactGrab.page.waitForTimeout(TOGGLE_ANIMATION_SETTLE_MS);

      const afterNormalCycle = await getToggleButtonCenter(reactGrab);
      expect(afterNormalCycle).not.toBeNull();
      expectPositionStable(settledPosition!, afterNormalCycle!);
    });
  });
});
