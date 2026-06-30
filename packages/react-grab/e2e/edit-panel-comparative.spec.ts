import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import {
  BUTTON_SELECTOR,
  clearEditStorage,
  getActivePropertyKey,
  getActivePropertyValue,
  getInlineStyleProperty,
  openEditPanel,
  setSearchInputValue,
} from "./edit-panel-helpers.js";

const UNIFORM_PADDING_SELECTOR = "[data-testid='th-1']";

const parsePx = (value: string | null): number => {
  if (!value) return Number.NaN;
  return Number.parseFloat(value.replace(/px$/, ""));
};

const applyComparative = async (page: Page, query: string): Promise<void> => {
  await setSearchInputValue(page, query);
  await page.waitForTimeout(80);
};

test.describe("Style Panel Comparative Commands", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await clearEditStorage(reactGrab.page);
  });

  test("'bigger' targets font size and increases it", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);

    await applyComparative(reactGrab.page, "font size");
    const baseline = parsePx(await getActivePropertyValue(reactGrab.page));

    await applyComparative(reactGrab.page, "bigger");
    expect(await getActivePropertyKey(reactGrab.page)).toBe("font-size");
    const enlarged = parsePx(await getActivePropertyValue(reactGrab.page));
    expect(enlarged).toBeGreaterThan(baseline);
  });

  test("amplifiers move the value further than a plain comparative", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);

    await applyComparative(reactGrab.page, "font size");
    const baseline = parsePx(await getActivePropertyValue(reactGrab.page));

    await applyComparative(reactGrab.page, "bigger");
    const single = parsePx(await getActivePropertyValue(reactGrab.page));

    await applyComparative(reactGrab.page, "much bigger");
    const amplified = parsePx(await getActivePropertyValue(reactGrab.page));

    expect(single).toBeGreaterThan(baseline);
    expect(amplified).toBeGreaterThan(single);
  });

  test("re-applying the same command is idempotent against the baseline", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);

    await applyComparative(reactGrab.page, "bigger");
    const firstApply = parsePx(await getActivePropertyValue(reactGrab.page));

    await applyComparative(reactGrab.page, "smaller");
    await applyComparative(reactGrab.page, "bigger");
    const secondApply = parsePx(await getActivePropertyValue(reactGrab.page));

    expect(secondApply).toBe(firstApply);
  });

  test("'more padding' increases padding on every side", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, UNIFORM_PADDING_SELECTOR);

    await applyComparative(reactGrab.page, "more padding");
    expect(await getActivePropertyKey(reactGrab.page)).toBe("padding");

    // th-1 starts at p-2 (8px); a single step floors at +4px.
    await expect
      .poll(() => getInlineStyleProperty(reactGrab.page, UNIFORM_PADDING_SELECTOR, "padding-top"))
      .toBe("12px");
    await expect
      .poll(() => getInlineStyleProperty(reactGrab.page, UNIFORM_PADDING_SELECTOR, "padding-left"))
      .toBe("12px");
  });

  test("'less padding' decreases padding", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, UNIFORM_PADDING_SELECTOR);

    await applyComparative(reactGrab.page, "less padding");
    await expect
      .poll(() => getInlineStyleProperty(reactGrab.page, UNIFORM_PADDING_SELECTOR, "padding-top"))
      .toBe("4px");
  });
});
