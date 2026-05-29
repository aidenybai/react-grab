import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import {
  BUTTON_SELECTOR,
  clearEditStorage,
  getActivePropertyKey,
  openEditPanel,
  setSearchInputValue,
} from "./edit-panel-helpers.js";

const VECTOR_SHAPE_SELECTOR = "[data-testid='autocomplete-vector-shape']";
const VECTOR_TARGET_OFFSET_PX = 24;
const VECTOR_TARGET_SIZE_PX = 48;

const addVectorTarget = async (page: Page): Promise<void> => {
  await page.evaluate(
    ({ offsetPx, sizePx }) => {
      if (document.querySelector("[data-testid='autocomplete-vector']")) return;
      const vectorElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      vectorElement.setAttribute("data-testid", "autocomplete-vector");
      vectorElement.setAttribute("viewBox", "0 0 24 24");
      vectorElement.style.position = "fixed";
      vectorElement.style.left = `${offsetPx}px`;
      vectorElement.style.top = `${offsetPx}px`;
      vectorElement.style.width = `${sizePx}px`;
      vectorElement.style.height = `${sizePx}px`;
      vectorElement.style.fill = "oklch(62.3% 0.214 259.815)";
      vectorElement.style.stroke = "oklch(70.7% 0.165 254.624)";
      vectorElement.style.zIndex = "1";
      const circleElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circleElement.setAttribute("data-testid", "autocomplete-vector-shape");
      circleElement.setAttribute("cx", "12");
      circleElement.setAttribute("cy", "12");
      circleElement.setAttribute("r", "8");
      circleElement.style.fill = "oklch(62.3% 0.214 259.815)";
      circleElement.style.stroke = "#60a5fa";
      circleElement.style.strokeWidth = "2";
      vectorElement.appendChild(circleElement);
      document.body.appendChild(vectorElement);
    },
    { offsetPx: VECTOR_TARGET_OFFSET_PX, sizePx: VECTOR_TARGET_SIZE_PX },
  );
};

test.describe("Style Panel Autocomplete", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await clearEditStorage(reactGrab.page);
  });

  test("tailwind color search terms select the matching color property", async ({ reactGrab }) => {
    const expectations = [
      ["color", "color"],
      ["text color", "color"],
      ["text-color", "color"],
      ["text-[#", "color"],
      ["text-red", "color"],
      ["text-blue", "color"],
      ["text-primary", "color"],
      ["text-[color:var(--color-primary)]", "color"],
      ["bg", "background-color"],
      ["bg-[#", "background-color"],
      ["bg-muted", "background-color"],
      ["bg-[var(--color-accent)]", "background-color"],
      ["background color", "background-color"],
      ["border-color", "border-color"],
      ["border-[#", "border-color"],
      ["border-t-red", "border-color"],
      ["border-x-blue", "border-color"],
    ];

    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    for (const [query, expectedPropertyKey] of expectations) {
      await setSearchInputValue(reactGrab.page, query);
      await reactGrab.page.waitForTimeout(80);
      expect(await getActivePropertyKey(reactGrab.page), query).toBe(expectedPropertyKey);
    }
  });

  test("tailwind svg color search terms select fill", async ({ reactGrab }) => {
    await addVectorTarget(reactGrab.page);
    const expectations = [["fill-[#", "fill"]];

    await openEditPanel(reactGrab, VECTOR_SHAPE_SELECTOR);
    for (const [query, expectedPropertyKey] of expectations) {
      await setSearchInputValue(reactGrab.page, query);
      await reactGrab.page.waitForTimeout(80);
      expect(await getActivePropertyKey(reactGrab.page), query).toBe(expectedPropertyKey);
    }
  });

  test("tailwind text size and property name terms select font size", async ({ reactGrab }) => {
    const expectations = [
      "text",
      "text-sm",
      "text-xl",
      "text-[12px]",
      "text-[length:12px]",
      "font size",
      "font-size",
    ];

    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    for (const query of expectations) {
      await setSearchInputValue(reactGrab.page, query);
      await reactGrab.page.waitForTimeout(80);
      expect(await getActivePropertyKey(reactGrab.page), query).toBe("font-size");
    }
  });

  test("common tailwind enum terms select their enum property", async ({ reactGrab }) => {
    const expectations = [
      ["text-center", "text-align"],
      ["border-dashed", "border-style"],
      ["font-mono", "font-family"],
      ["font-bold", "font-weight"],
      ["uppercase", "text-transform"],
    ];

    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    for (const [query, expectedPropertyKey] of expectations) {
      await setSearchInputValue(reactGrab.page, query);
      await reactGrab.page.waitForTimeout(80);
      expect(await getActivePropertyKey(reactGrab.page), query).toBe(expectedPropertyKey);
    }
  });

  test("common tailwind numeric prefix terms select their property", async ({ reactGrab }) => {
    const expectations = [
      ["border-2", "border-width"],
      ["tracking-tight", "letter-spacing"],
      ["leading-6", "line-height"],
      ["rounded-lg", "border-radius"],
    ];

    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    for (const [query, expectedPropertyKey] of expectations) {
      await setSearchInputValue(reactGrab.page, query);
      await reactGrab.page.waitForTimeout(80);
      expect(await getActivePropertyKey(reactGrab.page), query).toBe(expectedPropertyKey);
    }
  });
});
