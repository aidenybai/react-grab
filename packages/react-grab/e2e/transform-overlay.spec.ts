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

  test("dragging the frame body reinserts the element in the DOM", async ({ reactGrab }) => {
    const { page } = reactGrab;
    const SIBLING_SELECTOR = "[data-testid='deeply-nested-text']";
    await openEditPanel(reactGrab, TARGET_SELECTOR);
    await expect.poll(() => isTransformOverlayVisible(page)).toBe(true);

    // The button starts after its sibling paragraph in the same container.
    const orderBefore = await page.evaluate(
      ({ moved, sibling }) => {
        const movedElement = document.querySelector(moved);
        const siblingElement = document.querySelector(sibling);
        return movedElement?.previousElementSibling === siblingElement;
      },
      { moved: TARGET_SELECTOR, sibling: SIBLING_SELECTOR },
    );
    expect(orderBefore).toBe(true);

    const points = await page.evaluate(
      ({ moved, sibling }) => {
        const host = document.querySelector("[data-react-grab]");
        const overlay = host?.shadowRoot?.querySelector<HTMLElement>(
          "[data-react-grab-transform-overlay]",
        );
        const siblingElement = document.querySelector(sibling);
        if (!overlay || !siblingElement) throw new Error("overlay or sibling missing");
        void moved;
        const overlayBounds = overlay.getBoundingClientRect();
        const siblingBounds = siblingElement.getBoundingClientRect();
        return {
          from: {
            x: overlayBounds.left + overlayBounds.width / 2,
            y: overlayBounds.top + overlayBounds.height / 2,
          },
          // Upper half of the sibling → insert before it.
          to: { x: siblingBounds.left + 4, y: siblingBounds.top + 2 },
        };
      },
      { moved: TARGET_SELECTOR, sibling: SIBLING_SELECTOR },
    );

    await page.mouse.move(points.from.x, points.from.y);
    await page.mouse.down();
    await page.mouse.move(points.to.x, points.to.y, { steps: 8 });
    await page.mouse.up();

    // The button is now reinserted before the paragraph in the DOM.
    const movedBefore = await page.evaluate(
      ({ moved, sibling }) => {
        const movedElement = document.querySelector(moved);
        const siblingElement = document.querySelector(sibling);
        return movedElement?.nextElementSibling === siblingElement;
      },
      { moved: TARGET_SELECTOR, sibling: SIBLING_SELECTOR },
    );
    expect(movedBefore).toBe(true);
  });
});
