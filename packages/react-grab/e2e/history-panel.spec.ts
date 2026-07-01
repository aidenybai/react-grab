import type { Page } from "@playwright/test";
import { ATTRIBUTE_NAME } from "./constants.js";
import { expect, test } from "./fixtures.js";

const HISTORY_PANEL_ATTR = "data-react-grab-history-panel";
const ADD_BUTTON_SELECTOR = "[data-testid='add-element-button']";

const isHistoryPanelVisible = async (page: Page): Promise<boolean> =>
  page.evaluate(
    ({ attrName, panelAttr }) => {
      const shadowRoot = document.querySelector(`[${attrName}]`)?.shadowRoot;
      return Boolean(shadowRoot?.querySelector(`[${panelAttr}]`));
    },
    { attrName: ATTRIBUTE_NAME, panelAttr: HISTORY_PANEL_ATTR },
  );

// Reads the "<cursor> / <total>" position label from the panel footer.
const readHistoryPosition = async (page: Page): Promise<{ cursor: number; total: number } | null> =>
  page.evaluate(
    ({ attrName, panelAttr }) => {
      const shadowRoot = document.querySelector(`[${attrName}]`)?.shadowRoot;
      const panel = shadowRoot?.querySelector(`[${panelAttr}]`);
      const match = panel?.textContent?.match(/(\d+)\s*\/\s*(\d+)/);
      if (!match) return null;
      return { cursor: Number(match[1]), total: Number(match[2]) };
    },
    { attrName: ATTRIBUTE_NAME, panelAttr: HISTORY_PANEL_ATTR },
  );

test.describe("Render history panel", () => {
  test("records commits and scrubs a component's timeline", async ({ reactGrab }) => {
    const page = reactGrab.page;

    // Generate history while grab is inactive: each click re-renders
    // DynamicElements with a new `elements` array (a tracked state change).
    for (let clickIndex = 0; clickIndex < 3; clickIndex++) {
      await page.click(ADD_BUTTON_SELECTOR);
      await page.waitForTimeout(50);
    }

    await reactGrab.activate();
    await reactGrab.hoverUntilSelected(ADD_BUTTON_SELECTOR);
    await reactGrab.rightClickElement(ADD_BUTTON_SELECTOR);
    await reactGrab.clickContextMenuItem("History");

    await expect.poll(() => isHistoryPanelVisible(page)).toBe(true);

    const initialPosition = await readHistoryPosition(page);
    expect(initialPosition).not.toBeNull();
    expect(initialPosition!.total).toBeGreaterThanOrEqual(2);
    // Opens focused on the most recent moment.
    expect(initialPosition!.cursor).toBe(initialPosition!.total);

    await page.keyboard.press("ArrowLeft");
    await expect
      .poll(async () => (await readHistoryPosition(page))?.cursor)
      .toBe(initialPosition!.total - 1);

    await page.keyboard.press("ArrowRight");
    await expect
      .poll(async () => (await readHistoryPosition(page))?.cursor)
      .toBe(initialPosition!.total);

    await page.keyboard.press("Escape");
    await expect.poll(() => isHistoryPanelVisible(page)).toBe(false);
  });
});
