import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.js";
import {
  BUTTON_SELECTOR,
  CARD_SELECTOR,
  clearEditStorage,
  EDIT_PANEL_ATTR,
  EDIT_PROPERTY_ATTR,
  getActivePropertyKey,
  getVisiblePropertyKeys,
  isEditPanelVisible,
  openEditPanel,
  SEARCH_INPUT_ATTR,
} from "./edit-panel-helpers.js";

const PLAIN_TEXT_SELECTOR = "[data-testid='deeply-nested-text']";

const getElementText = async (page: Page, selector: string): Promise<string> =>
  page.evaluate((sel) => document.querySelector(sel)?.textContent ?? "", selector);

const commitTextContent = async (page: Page, nextValue: string): Promise<void> => {
  const editPanel = page.locator(`[${EDIT_PANEL_ATTR}]`);
  const textRow = editPanel.locator(`[${EDIT_PROPERTY_ATTR}="text-content"]`);
  // Activate the row, then click its value to open the inline editor.
  await textRow.click();
  await textRow.locator("[data-react-grab-value]").click();
  const input = editPanel.locator(`input[${SEARCH_INPUT_ATTR}]`);
  await input.waitFor({ state: "visible" });
  // The editor must survive the interaction-idle window: a deferred
  // hover-activation used to steal the active row ~150ms after opening
  // and tear the editor down mid-edit.
  await page.waitForTimeout(300);
  await input.fill(nextValue);
  await input.press("Enter");
};

test.describe("Style Panel Text Content", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await clearEditStorage(reactGrab.page);
  });

  test("text content is offered for text-leaf elements", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);

    const propertyKeys = await getVisiblePropertyKeys(reactGrab.page);
    expect(propertyKeys).toContain("text-content");
  });

  test("text content does not preempt the default-active row", async ({ reactGrab }) => {
    // A plain text element with no Tailwind-derived prioritized props:
    // text-content is the only prioritized row, so it sits at index 0.
    // The keyboard cursor must still land on an adjustable row, not text.
    await openEditPanel(reactGrab, PLAIN_TEXT_SELECTOR);

    const propertyKeys = await getVisiblePropertyKeys(reactGrab.page);
    expect(propertyKeys).toContain("text-content");
    expect(propertyKeys[0]).toBe("text-content");
    expect(await getActivePropertyKey(reactGrab.page)).not.toBe("text-content");
  });

  test("text content is not offered for elements that contain child elements", async ({
    reactGrab,
  }) => {
    const { page } = reactGrab;
    await reactGrab.activate();
    const cardBounds = await reactGrab.getElementBounds(CARD_SELECTOR);
    if (!cardBounds) throw new Error("Card bounds not found");

    // Aim at the card's top-left padding so the container itself is the
    // target — its center would land on a nested text descendant.
    const paddingX = cardBounds.x + 4;
    const paddingY = cardBounds.y + 4;
    await page.mouse.move(paddingX, paddingY);
    await page.waitForTimeout(350);
    await reactGrab.rightClickAtPosition(paddingX, paddingY);
    await reactGrab.clickContextMenuItem("Style");
    await expect.poll(() => isEditPanelVisible(page)).toBe(true);

    const propertyKeys = await getVisiblePropertyKeys(page);
    expect(propertyKeys).not.toContain("text-content");
  });

  test("editing text previews live and persists after submit", async ({ reactGrab }) => {
    const { page } = reactGrab;
    expect(await getElementText(page, BUTTON_SELECTOR)).toBe("Nested Button");

    await openEditPanel(reactGrab, BUTTON_SELECTOR);

    await commitTextContent(page, "Edited Label");

    // The commit previews the new text live on the element.
    await expect.poll(() => getElementText(page, BUTTON_SELECTOR)).toBe("Edited Label");

    // Submit the panel; the committed text remains applied (not reverted).
    await page.waitForTimeout(120);
    await page.keyboard.press("Enter");
    await expect.poll(() => isEditPanelVisible(page)).toBe(false);
    await page.waitForTimeout(150);

    expect(await getElementText(page, BUTTON_SELECTOR)).toBe("Edited Label");
  });

  test("discarding restores the original text", async ({ reactGrab }) => {
    const { page } = reactGrab;
    await openEditPanel(reactGrab, BUTTON_SELECTOR);

    await commitTextContent(page, "Temporary");
    await expect.poll(() => getElementText(page, BUTTON_SELECTOR)).toBe("Temporary");

    // First Escape raises the discard confirmation, second confirms discard.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(80);
    await page.keyboard.press("Escape");
    await expect.poll(() => isEditPanelVisible(page)).toBe(false);
    await page.waitForTimeout(120);

    expect(await getElementText(page, BUTTON_SELECTOR)).toBe("Nested Button");
  });
});
