import { test, expect } from "./fixtures.js";
import { ATTRIBUTE_NAME } from "./constants.js";

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
    await reactGrab.hoverUntilSelected("[data-testid='edge-bottom-right']");

    await expect
      .poll(() =>
        page.evaluate(
          ({ attributeName, selector }) => {
            const host = document.querySelector(`[${attributeName}]`);
            const canvas = host?.shadowRoot?.querySelector("canvas");
            const element = document.querySelector(selector);
            if (!canvas || !element) return -1;
            const context = canvas.getContext("2d");
            if (!context) return -1;
            const bounds = element.getBoundingClientRect();
            const scale =
              canvas.width / parseFloat(canvas.style.width || String(window.innerWidth));
            const startX = Math.max(0, Math.round((bounds.x - 10) * scale));
            const startY = Math.max(0, Math.round((bounds.y - 10) * scale));
            const width = Math.min(canvas.width - startX, Math.round((bounds.width + 20) * scale));
            const height = Math.min(
              canvas.height - startY,
              Math.round((bounds.height + 20) * scale),
            );
            if (width <= 0 || height <= 0) return 0;
            const pixels = context.getImageData(startX, startY, width, height).data;
            let drawnPixels = 0;
            for (let index = 3; index < pixels.length; index += 4) {
              if (pixels[index] > 5) drawnPixels += 1;
            }
            return drawnPixels;
          },
          { attributeName: ATTRIBUTE_NAME, selector: "[data-testid='edge-bottom-right']" },
        ),
      )
      .toBeGreaterThan(0);
  });
});
