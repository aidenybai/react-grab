import { expect, test } from "./fixtures.js";
import {
  ATTRIBUTE_NAME,
  BUTTON_SELECTOR,
  EDIT_PANEL_ATTR,
  EDIT_PROPERTY_ATTR,
  clearEditStorage,
  getActivePropertyKey,
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

  test("typing bg-red-500 applies the palette background color", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    await setSearchInputValue(reactGrab.page, "bg-red-500");
    await reactGrab.page.waitForTimeout(120);
    const background = await getInlineStyleProperty(
      reactGrab.page,
      BUTTON_SELECTOR,
      "background-color",
    );
    expect(background.replace(/\s/g, "")).toBe("rgb(239,68,68)");
  });

  test("typing text-slate-500 applies the palette text color", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    await setSearchInputValue(reactGrab.page, "text-slate-500");
    await reactGrab.page.waitForTimeout(120);
    const color = await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "color");
    expect(color.replace(/\s/g, "")).toBe("rgb(100,116,139)");
  });

  test("typing bg-black applies the keyword color", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    await setSearchInputValue(reactGrab.page, "bg-black");
    await reactGrab.page.waitForTimeout(120);
    const background = await getInlineStyleProperty(
      reactGrab.page,
      BUTTON_SELECTOR,
      "background-color",
    );
    expect(background.replace(/\s/g, "")).toBe("rgb(0,0,0)");
  });

  test("typing bg-grey-500 resolves the grey alias to gray", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    await setSearchInputValue(reactGrab.page, "bg-grey-500");
    await reactGrab.page.waitForTimeout(120);
    const background = await getInlineStyleProperty(
      reactGrab.page,
      BUTTON_SELECTOR,
      "background-color",
    );
    expect(background.replace(/\s/g, "")).toBe("rgb(107,114,128)");
  });

  test("a theme color token without a fixed value is not applied", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    await setSearchInputValue(reactGrab.page, "bg-primary");
    await reactGrab.page.waitForTimeout(120);
    const background = await getInlineStyleProperty(
      reactGrab.page,
      BUTTON_SELECTOR,
      "background-color",
    );
    expect(background).toBe("");
    // The color row is still surfaced so the value can be picked manually.
    await expect.poll(() => getActivePropertyKey(reactGrab.page)).toBe("background-color");
  });

  test("picking a color on an unset (transparent) row produces an opaque color", async ({
    reactGrab,
  }) => {
    const { page } = reactGrab;
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

  test("a space before the bracket is treated as the arbitrary separator", async ({
    reactGrab,
  }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    await setSearchInputValue(reactGrab.page, "text [13px]");
    await reactGrab.page.waitForTimeout(120);
    const fontSize = await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "font-size");
    expect(fontSize).toBe("13px");
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

  test("arrow keys on a color row open the color picker", async ({ reactGrab }) => {
    const { page } = reactGrab;
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    await setSearchInputValue(page, "background");
    await expect.poll(() => getActivePropertyKey(page)).toBe("background-color");

    await page.evaluate(
      ({ attrName, panelAttr }) => {
        const host = document.querySelector(`[${attrName}]`);
        const nativePicker = host?.shadowRoot?.querySelector<HTMLInputElement>(
          `[${panelAttr}] input[type="color"]`,
        );
        if (!nativePicker) throw new Error("native color picker not found");
        (window as unknown as { __pickerClicks: number }).__pickerClicks = 0;
        nativePicker.addEventListener("click", () => {
          (window as unknown as { __pickerClicks: number }).__pickerClicks += 1;
        });
      },
      { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR },
    );

    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { __pickerClicks: number }).__pickerClicks),
      )
      .toBeGreaterThan(0);
  });

  test("arbitrary px lengths do not apply to unitless properties", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    await setSearchInputValue(reactGrab.page, "opacity-[50px]");
    await reactGrab.page.waitForTimeout(120);
    const opacity = await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "opacity");
    expect(opacity).toBe("");
  });

  test("clearing the search restores the first numeric cursor, not a color row", async ({
    reactGrab,
  }) => {
    const { page } = reactGrab;
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    await setSearchInputValue(page, "padding");
    await page.waitForTimeout(80);
    await setSearchInputValue(page, "");
    await page.waitForTimeout(80);
    const activeKey = await getActivePropertyKey(page);
    expect(activeKey).not.toBe("background-color");
    expect(activeKey).not.toBe("color");
  });

  test("a length: data-type hint applies a unitless value as px", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, BUTTON_SELECTOR);
    await setSearchInputValue(reactGrab.page, "text-[length:20]");
    await reactGrab.page.waitForTimeout(120);
    const fontSize = await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "font-size");
    expect(fontSize).toBe("20px");
  });

  test("unitless arbitrary values are not auto-applied as pixels", async ({ reactGrab }) => {
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
