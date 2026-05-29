import { expect, test } from "./fixtures.js";
import {
  ATTRIBUTE_NAME,
  BUTTON_SELECTOR,
  EDIT_PANEL_ATTR,
  EDIT_PROPERTY_ATTR,
  clearEditStorage,
  getVisiblePropertyKeys,
  openEditPanel,
} from "./edit-panel-helpers.js";

test.describe("Style Panel Color Controls", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await clearEditStorage(reactGrab.page);
  });

  test("default text color stays available in the property list", async ({ reactGrab }) => {
    await reactGrab.page.evaluate((selector) => {
      document.querySelector(selector)?.classList.remove("text-white");
    }, BUTTON_SELECTOR);
    await openEditPanel(reactGrab, BUTTON_SELECTOR);

    const propertyKeys = await getVisiblePropertyKeys(reactGrab.page);
    expect(propertyKeys).toContain("color");

    const isColorPickerVisible = await reactGrab.page.evaluate(
      ({ attrName, panelAttr, propertyAttr }) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        const colorPropertyRow = shadowRoot?.querySelector<HTMLElement>(
          `[${propertyAttr}="color"]`,
        );
        colorPropertyRow?.click();
        const colorPickerButton = shadowRoot?.querySelector<HTMLElement>(
          `[${panelAttr}] button[aria-label="Pick color"]`,
        );
        const pickerBounds = colorPickerButton?.getBoundingClientRect();
        return Boolean(pickerBounds && pickerBounds.width > 0 && pickerBounds.height > 0);
      },
      { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR, propertyAttr: EDIT_PROPERTY_ATTR },
    );
    expect(isColorPickerVisible).toBe(true);
  });
});
