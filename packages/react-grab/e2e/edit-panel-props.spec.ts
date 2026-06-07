import { expect, test } from "./fixtures.js";
import {
  focusDiscardButton,
  getActivePropertyKey,
  getVisiblePropertyKeys,
  isEditPanelVisible,
  openDiscardPromptViaEscape,
  openEditPanel,
  setSearchInputValue,
} from "./edit-panel-helpers.js";

const PROPS_BOX_SELECTOR = "[data-testid='motionish-box']";
const OPACITY_TEXT_SELECTOR = "[data-testid='motionish-opacity']";
const DURATION_TEXT_SELECTOR = "[data-testid='motionish-duration']";
const COUNT_TEXT_SELECTOR = "[data-testid='motionish-count']";

const getRenderedText = (selector: string) => async (page: import("@playwright/test").Page) =>
  page.locator(selector).first().textContent();

test.describe("Style Panel - React props", () => {
  test("derives numeric prop rows from the nearest component fiber", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, PROPS_BOX_SELECTOR);
    expect(await isEditPanelVisible(reactGrab.page)).toBe(true);

    const visibleKeys = await getVisiblePropertyKeys(reactGrab.page);
    expect(visibleKeys).toContain("prop:animate.opacity");
    expect(visibleKeys).toContain("prop:animate.scale");
    expect(visibleKeys).toContain("prop:transition.duration");
    expect(visibleKeys).toContain("prop:count");
  });

  test("prop rows lead the panel and start active", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, PROPS_BOX_SELECTOR);
    const activeKey = await getActivePropertyKey(reactGrab.page);
    expect(activeKey?.startsWith("prop:")).toBe(true);
  });

  test("stepping a prop live-updates the component via overrideProps", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, PROPS_BOX_SELECTOR);
    await setSearchInputValue(reactGrab.page, "animate.opacity");
    await expect
      .poll(() => getActivePropertyKey(reactGrab.page))
      .toBe("prop:animate.opacity");

    expect(await getRenderedText(OPACITY_TEXT_SELECTOR)(reactGrab.page)).toBe("1");

    await reactGrab.pressArrowLeft();

    await expect
      .poll(() => getRenderedText(OPACITY_TEXT_SELECTOR)(reactGrab.page))
      .toBe("0.95");
  });

  test("integer-stepped props snap by whole numbers", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, PROPS_BOX_SELECTOR);
    await setSearchInputValue(reactGrab.page, "count");
    await expect.poll(() => getActivePropertyKey(reactGrab.page)).toBe("prop:count");

    expect(await getRenderedText(COUNT_TEXT_SELECTOR)(reactGrab.page)).toBe("12");

    await reactGrab.pressArrowRight();

    await expect.poll(() => getRenderedText(COUNT_TEXT_SELECTOR)(reactGrab.page)).toBe("13");
  });

  test("discarding restores the original prop value", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, PROPS_BOX_SELECTOR);
    await setSearchInputValue(reactGrab.page, "transition.duration");
    await expect
      .poll(() => getActivePropertyKey(reactGrab.page))
      .toBe("prop:transition.duration");

    expect(await getRenderedText(DURATION_TEXT_SELECTOR)(reactGrab.page)).toBe("0.5");

    await reactGrab.pressArrowRight();
    await expect
      .poll(() => getRenderedText(DURATION_TEXT_SELECTOR)(reactGrab.page))
      .toBe("0.6");

    // A pending edit guards dismissal behind a discard prompt; confirm it.
    await openDiscardPromptViaEscape(reactGrab.page);
    await focusDiscardButton(reactGrab.page, "confirm");
    await reactGrab.pressEnter();

    await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);
    await expect
      .poll(() => getRenderedText(DURATION_TEXT_SELECTOR)(reactGrab.page))
      .toBe("0.5");
  });

  test("submitting copies a prompt describing the prop change", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, PROPS_BOX_SELECTOR);
    await setSearchInputValue(reactGrab.page, "animate.opacity");
    await expect
      .poll(() => getActivePropertyKey(reactGrab.page))
      .toBe("prop:animate.opacity");

    await reactGrab.pressArrowLeft();
    await expect
      .poll(() => getRenderedText(OPACITY_TEXT_SELECTOR)(reactGrab.page))
      .toBe("0.95");

    const clipboardWritesPromise = reactGrab.captureNextClipboardWrites();
    await reactGrab.pressEnter();
    const clipboardWrites = await clipboardWritesPromise;
    const copiedText = clipboardWrites["text/plain"] ?? "";

    expect(copiedText).toContain("Props:");
    expect(copiedText).toContain("animate.opacity");
    expect(copiedText).toContain("0.95");
  });
});
