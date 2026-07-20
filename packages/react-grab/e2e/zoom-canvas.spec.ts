import { test, expect } from "./fixtures.js";
import { countScreenshotPixelDifferences } from "./count-screenshot-pixel-differences.js";

const MIN_CHANGED_PIXELS = 10;

// Browser zoom shrinks window.innerWidth/innerHeight (the visual viewport) while
// getBoundingClientRect keeps returning full layout coordinates. The overlay
// canvas must be sized to the layout viewport, or it draws the selection box
// off-canvas for any element past the shrunken edge — the box vanishes entirely.
const simulateBrowserZoom = (zoom: number) => {
  const realWidth = window.innerWidth;
  const realHeight = window.innerHeight;
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    get: () => Math.round(realWidth / zoom),
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    get: () => Math.round(realHeight / zoom),
  });
  window.dispatchEvent(new Event("resize"));
};

test.describe("Overlay canvas under browser zoom", () => {
  test("draws the selection box for a far element when the visual viewport is shrunken", async ({
    reactGrab,
    page,
  }) => {
    await page.evaluate(simulateBrowserZoom, 1.5);

    await reactGrab.activate();
    const target = page.locator("[data-testid='edge-bottom-right']");
    const beforeScreenshot = await target.screenshot();
    await reactGrab.hoverUntilSelected("[data-testid='edge-bottom-right']");
    const afterScreenshot = await target.screenshot();

    expect(
      await countScreenshotPixelDifferences(page, beforeScreenshot, afterScreenshot),
    ).toBeGreaterThan(MIN_CHANGED_PIXELS);
  });
});
