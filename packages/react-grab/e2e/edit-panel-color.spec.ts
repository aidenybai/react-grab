import { expect, test } from "./fixtures.js";
import {
  ATTRIBUTE_NAME,
  BUTTON_SELECTOR,
  EDIT_PANEL_ATTR,
  EDIT_PROPERTY_ATTR,
  clearEditStorage,
  getInlineStyleProperty,
  getVisiblePropertyKeys,
  openEditPanel,
  setSearchInputValue,
} from "./edit-panel-helpers.js";

const PLAIN_TEXT_SELECTOR = "[data-testid='deeply-nested-text']";

test.describe("Style Panel Color Controls", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await clearEditStorage(reactGrab.page);
  });

  test("text color and background are pinned to the top of the list", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    const propertyKeys = await getVisiblePropertyKeys(reactGrab.page);
    expect(propertyKeys.slice(0, 2)).toEqual(["background-color", "color"]);
  });

  test("background is offered even when the element has a transparent background", async ({
    reactGrab,
  }) => {
    // The plain text element paints no background, yet users still need
    // to be able to set one.
    await openEditPanel(reactGrab, PLAIN_TEXT_SELECTOR);
    const propertyKeys = await getVisiblePropertyKeys(reactGrab.page);
    expect(propertyKeys).toContain("background-color");
    expect(propertyKeys).toContain("color");
  });

  test("typing bg-[#hex] applies the background color", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    await setSearchInputValue(reactGrab.page, "bg-[#ff0000]");
    await reactGrab.page.waitForTimeout(120);
    const background = await getInlineStyleProperty(
      reactGrab.page,
      BUTTON_SELECTOR,
      "background-color",
    );
    // The browser normalizes the applied inline color to rgb form.
    expect(background.replace(/\s/g, "")).toBe("rgb(255,0,0)");
  });

  test("typing text-[rgb(...)] applies the text color", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    await setSearchInputValue(reactGrab.page, "text-[rgb(0_128_255)]");
    await reactGrab.page.waitForTimeout(120);
    const color = await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "color");
    expect(color.replace(/\s/g, "")).toBe("rgb(0,128,255)");
  });

  test("picking a color on an unset (transparent) row produces an opaque color", async ({
    reactGrab,
  }) => {
    const { page } = reactGrab;
    // The plain text element has no background — the pinned "background"
    // row starts fully transparent (#00000000). Picking a color must not
    // re-apply the 00 alpha (which would keep it invisible).
    await openEditPanel(reactGrab, PLAIN_TEXT_SELECTOR);
    await page.locator(`[${EDIT_PANEL_ATTR}] [${EDIT_PROPERTY_ATTR}="background-color"]`).click();

    await page.evaluate(
      ({ attrName, panelAttr }) => {
        const host = document.querySelector(`[${attrName}]`);
        const nativePicker = host?.shadowRoot?.querySelector<HTMLInputElement>(
          `[${panelAttr}] input[type="color"]`,
        );
        if (!nativePicker) throw new Error("native color picker not found");
        nativePicker.value = "#ff0000";
        nativePicker.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
      },
      { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR },
    );
    await page.waitForTimeout(120);

    const background = await getInlineStyleProperty(page, PLAIN_TEXT_SELECTOR, "background-color");
    expect(background.replace(/\s/g, "")).toBe("rgb(255,0,0)");
  });

  test("typing text-[13px] applies font size, not a text color", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    await setSearchInputValue(reactGrab.page, "text-[13px]");
    await reactGrab.page.waitForTimeout(120);
    const fontSize = await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "font-size");
    const color = await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "color");
    expect(fontSize).toBe("13px");
    expect(color).toBe("");
  });

  test("typing text-[2rem] resolves rem to px font size", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    await setSearchInputValue(reactGrab.page, "text-[2rem]");
    await reactGrab.page.waitForTimeout(120);
    const fontSize = await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "font-size");
    expect(fontSize).toBe("32px");
  });

  test("unitless arbitrary values are not auto-applied as pixels", async ({ reactGrab }) => {
    // `leading-[1.5]` is a unitless multiplier, not 1.5px — guessing a px
    // value here would be wrong, so nothing should be applied.
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    await setSearchInputValue(reactGrab.page, "leading-[1.5]");
    await reactGrab.page.waitForTimeout(120);
    const lineHeight = await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "line-height");
    expect(lineHeight).toBe("");
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
