import { expect, test } from "./fixtures.js";
import {
  BUTTON_SELECTOR,
  clearEditStorage,
  getActivePropertyKey,
  getInlineStyleProperty,
  getTransformHandleCenter,
  isEditPanelCompact,
  isEditPanelVisible,
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

  test("Alt-resizing scales symmetrically about the center", async ({ reactGrab }) => {
    const { page } = reactGrab;
    await openEditPanel(reactGrab, TARGET_SELECTOR);
    await expect.poll(() => isTransformOverlayVisible(page)).toBe(true);

    const rectBefore = await page.evaluate((selector) => {
      const bounds = document.querySelector(selector)!.getBoundingClientRect();
      return { left: bounds.left, width: bounds.width };
    }, TARGET_SELECTOR);

    const handle = await getTransformHandleCenter(page, "Resize se");
    await page.keyboard.down("Alt");
    await page.mouse.move(handle.x, handle.y);
    await page.mouse.down();
    await page.mouse.move(handle.x + 60, handle.y + 40, { steps: 6 });
    await page.mouse.up();
    await page.keyboard.up("Alt");

    const rectAfter = await page.evaluate((selector) => {
      const bounds = document.querySelector(selector)!.getBoundingClientRect();
      return { left: bounds.left, width: bounds.width };
    }, TARGET_SELECTOR);

    // Symmetric growth pushes the left edge outward instead of pinning it.
    expect(rectAfter.width).toBeGreaterThan(rectBefore.width + 20);
    expect(rectAfter.left).toBeLessThan(rectBefore.left - 5);
  });

  test("resizing compacts the panel onto the dimension being edited", async ({ reactGrab }) => {
    const { page } = reactGrab;
    await openEditPanel(reactGrab, TARGET_SELECTOR);
    await expect.poll(() => isTransformOverlayVisible(page)).toBe(true);
    expect(await isEditPanelCompact(page)).toBe(false);

    // Drag the east-west bias of the SE handle so width changes most.
    const handle = await getTransformHandleCenter(page, "Resize se");
    await page.mouse.move(handle.x, handle.y);
    await page.mouse.down();
    await page.mouse.move(handle.x + 80, handle.y + 10, { steps: 6 });
    await page.mouse.up();

    expect(await isEditPanelCompact(page)).toBe(true);
    expect(await getActivePropertyKey(page)).toBe("width");
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

  test("clicking the frame without dragging does not move the element", async ({ reactGrab }) => {
    const { page } = reactGrab;
    const SIBLING_SELECTOR = "[data-testid='deeply-nested-text']";
    await openEditPanel(reactGrab, TARGET_SELECTOR);
    await expect.poll(() => isTransformOverlayVisible(page)).toBe(true);

    const orderBefore = await page.evaluate(
      ({ moved, sibling }) =>
        document.querySelector(moved)?.previousElementSibling === document.querySelector(sibling),
      { moved: TARGET_SELECTOR, sibling: SIBLING_SELECTOR },
    );
    expect(orderBefore).toBe(true);

    const center = await page.evaluate(() => {
      const host = document.querySelector("[data-react-grab]");
      const overlay = host?.shadowRoot?.querySelector<HTMLElement>(
        "[data-react-grab-transform-overlay]",
      );
      if (!overlay) throw new Error("overlay not found");
      const bounds = overlay.getBoundingClientRect();
      return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    });

    // A click (down + up, no drag) must not reinsert the element.
    await page.mouse.click(center.x, center.y);
    await page.waitForTimeout(120);

    const orderAfter = await page.evaluate(
      ({ moved, sibling }) =>
        document.querySelector(moved)?.previousElementSibling === document.querySelector(sibling),
      { moved: TARGET_SELECTOR, sibling: SIBLING_SELECTOR },
    );
    expect(orderAfter).toBe(true);
  });

  test("clicking another element retargets the panel and overlay to it", async ({ reactGrab }) => {
    const { page } = reactGrab;
    const OTHER_SELECTOR = "[data-testid='deeply-nested-text']";
    await openEditPanel(reactGrab, TARGET_SELECTOR);
    await expect.poll(() => isTransformOverlayVisible(page)).toBe(true);

    const other = await page.evaluate((selector) => {
      const bounds = document.querySelector(selector)!.getBoundingClientRect();
      return {
        // Click near the left edge so the click can't land on the
        // toolbar-anchored (centered) panel.
        x: bounds.left + 8,
        y: bounds.top + bounds.height / 2,
        width: Math.round(bounds.width),
      };
    }, OTHER_SELECTOR);

    await page.mouse.click(other.x, other.y);
    await page.waitForTimeout(150);

    // The panel stays open and the overlay now frames the clicked element.
    expect(await isEditPanelVisible(page)).toBe(true);
    const overlayWidth = await page.evaluate(() => {
      const host = document.querySelector("[data-react-grab]");
      const overlay = host?.shadowRoot?.querySelector<HTMLElement>(
        "[data-react-grab-transform-overlay]",
      );
      return overlay ? Math.round(overlay.getBoundingClientRect().width) : -1;
    });
    expect(Math.abs(overlayWidth - other.width)).toBeLessThan(4);
  });

  test("deselects when the selected element is removed from the DOM", async ({ reactGrab }) => {
    const { page } = reactGrab;
    await openEditPanel(reactGrab, TARGET_SELECTOR);
    await expect.poll(() => isTransformOverlayVisible(page)).toBe(true);

    await page.evaluate((selector) => {
      document.querySelector(selector)?.remove();
    }, TARGET_SELECTOR);

    await expect.poll(() => isEditPanelVisible(page)).toBe(false);
    expect(await isTransformOverlayVisible(page)).toBe(false);
  });

  test("shows a drag ghost while moving and clears it on drop", async ({ reactGrab }) => {
    const { page } = reactGrab;
    await openEditPanel(reactGrab, TARGET_SELECTOR);
    await expect.poll(() => isTransformOverlayVisible(page)).toBe(true);

    const isGhostVisible = () =>
      page.evaluate(() => {
        const host = document.querySelector("[data-react-grab]");
        const ghost = host?.shadowRoot?.querySelector<HTMLElement>("[data-react-grab-drag-ghost]");
        if (!ghost) return false;
        const bounds = ghost.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0;
      });

    const start = await page.evaluate(() => {
      const host = document.querySelector("[data-react-grab]");
      const overlay = host?.shadowRoot?.querySelector<HTMLElement>(
        "[data-react-grab-transform-overlay]",
      );
      if (!overlay) throw new Error("overlay not found");
      const bounds = overlay.getBoundingClientRect();
      return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    });

    expect(await isGhostVisible()).toBe(false);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 30, start.y - 40, { steps: 6 });
    expect(await isGhostVisible()).toBe(true);

    await page.mouse.up();
    expect(await isGhostVisible()).toBe(false);
  });
});
