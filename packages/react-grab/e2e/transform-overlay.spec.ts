import { expect, test } from "./fixtures.js";
import {
  BUTTON_SELECTOR,
  clearEditStorage,
  getInlineStyleProperty,
  getTransformHandleCenter,
  isTransformOverlayVisible,
  openEditPanel,
} from "./edit-panel-helpers.js";

// A leaf element so the right-click that opens the panel reliably selects
// this exact node (a container would resolve to whichever child is hovered).
const TARGET_SELECTOR = BUTTON_SELECTOR;

const getOffsetWidth = (page: import("@playwright/test").Page, selector: string): Promise<number> =>
  page.evaluate((elementSelector) => {
    const element = document.querySelector(elementSelector);
    return element instanceof HTMLElement ? element.offsetWidth : 0;
  }, selector);

const getOffsetHeight = (
  page: import("@playwright/test").Page,
  selector: string,
): Promise<number> =>
  page.evaluate((elementSelector) => {
    const element = document.querySelector(elementSelector);
    return element instanceof HTMLElement ? element.offsetHeight : 0;
  }, selector);

test.describe("Transform Overlay", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await clearEditStorage(reactGrab.page);
  });

  test("renders a Figma-style handle frame over the styled element", async ({ reactGrab }) => {
    await openEditPanel(reactGrab, TARGET_SELECTOR);

    await expect.poll(() => isTransformOverlayVisible(reactGrab.page)).toBe(true);
  });

  test("dragging the south-east handle grows width and height", async ({ reactGrab }) => {
    const { page } = reactGrab;
    await openEditPanel(reactGrab, TARGET_SELECTOR);
    await expect.poll(() => isTransformOverlayVisible(page)).toBe(true);

    const startWidth = await getOffsetWidth(page, TARGET_SELECTOR);
    const startHeight = await getOffsetHeight(page, TARGET_SELECTOR);

    const handle = await getTransformHandleCenter(page, "Resize se");
    await page.mouse.move(handle.x, handle.y);
    await page.mouse.down();
    await page.mouse.move(handle.x + 60, handle.y + 40, { steps: 6 });
    await page.mouse.up();

    await expect.poll(() => getOffsetWidth(page, TARGET_SELECTOR)).toBeGreaterThan(startWidth + 20);
    await expect
      .poll(() => getOffsetHeight(page, TARGET_SELECTOR))
      .toBeGreaterThan(startHeight + 10);
    expect(await getInlineStyleProperty(page, TARGET_SELECTOR, "width")).not.toBe("");
  });

  test("dragging the frame body translates the element", async ({ reactGrab }) => {
    const { page } = reactGrab;
    await openEditPanel(reactGrab, TARGET_SELECTOR);
    await expect.poll(() => isTransformOverlayVisible(page)).toBe(true);

    const overlayCenter = await page.evaluate(() => {
      const host = document.querySelector("[data-react-grab]");
      const overlay = host?.shadowRoot?.querySelector<HTMLElement>(
        "[data-react-grab-transform-overlay]",
      );
      if (!overlay) throw new Error("overlay not found");
      const bounds = overlay.getBoundingClientRect();
      return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    });

    await page.mouse.move(overlayCenter.x, overlayCenter.y);
    await page.mouse.down();
    await page.mouse.move(overlayCenter.x + 50, overlayCenter.y + 30, { steps: 6 });
    await page.mouse.up();

    expect(await getInlineStyleProperty(page, TARGET_SELECTOR, "transform")).toContain(
      "translate(",
    );
  });
});
