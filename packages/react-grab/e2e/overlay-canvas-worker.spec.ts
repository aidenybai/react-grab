import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures.js";
import { ATTRIBUTE_NAME } from "./constants.js";
import { countScreenshotPixelDifferences } from "./count-screenshot-pixel-differences.js";

const MIN_CHANGED_PIXELS = 10;

const getOverlayBackend = async (page: Page) =>
  page.evaluate((attributeName) => {
    const host = document.querySelector(`[${attributeName}]`);
    return host?.shadowRoot
      ?.querySelector("[data-react-grab-overlay-canvas]")
      ?.getAttribute("data-react-grab-overlay-backend");
  }, ATTRIBUTE_NAME);

test.describe("Overlay canvas renderer backend", () => {
  test("renders selection boxes in the offscreen worker", async ({ reactGrab, page }) => {
    await reactGrab.activate();
    await expect.poll(() => getOverlayBackend(page)).toBe("worker");
    const target = page.locator("[data-testid='edge-bottom-right']");
    const beforeScreenshot = await target.screenshot();

    await reactGrab.hoverUntilSelected("[data-testid='edge-bottom-right']");
    const afterScreenshot = await target.screenshot();

    expect(
      await countScreenshotPixelDifferences(page, beforeScreenshot, afterScreenshot),
    ).toBeGreaterThan(MIN_CHANGED_PIXELS);
  });

  test("uses the shared main-thread renderer when offscreen transfer is unavailable", async ({
    reactGrab,
    page,
  }) => {
    await page.evaluate(() => {
      Object.defineProperty(HTMLCanvasElement.prototype, "transferControlToOffscreen", {
        configurable: true,
        value: undefined,
      });
    });
    await reactGrab.reinitialize();
    await reactGrab.activate();
    await expect.poll(() => getOverlayBackend(page)).toBe("main-thread");
    const target = page.locator("[data-testid='edge-bottom-left']");
    const beforeScreenshot = await target.screenshot();

    await reactGrab.hoverUntilSelected("[data-testid='edge-bottom-left']");
    const afterScreenshot = await target.screenshot();

    expect(
      await countScreenshotPixelDifferences(page, beforeScreenshot, afterScreenshot),
    ).toBeGreaterThan(MIN_CHANGED_PIXELS);
  });
});
