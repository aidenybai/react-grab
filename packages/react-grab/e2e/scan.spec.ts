import { test, expect, type ReactGrabPageObject } from "./fixtures.js";
import type { Page } from "@playwright/test";

const ATTRIBUTE_NAME = "data-react-grab";

const waitForToolbar = async (reactGrab: ReactGrabPageObject) => {
  await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
};

// The scan button is independent of the overlay/active flow, so it can't go
// through the shared clickToolbarAction helper (which waits for activation).
const clickScanButton = async (page: Page) => {
  await page.evaluate((attrName) => {
    const host = document.querySelector(`[${attrName}]`);
    const root = host?.shadowRoot?.querySelector(`[${attrName}]`);
    const button = root?.querySelector<HTMLButtonElement>(
      '[data-react-grab-toolbar-action="scan"]',
    );
    button?.click();
  }, ATTRIBUTE_NAME);
};

const isScanCanvasPresent = (page: Page): Promise<boolean> =>
  page.evaluate(() => Boolean(document.querySelector("[data-react-grab-scan-canvas]")));

const isScanCopiedVisible = (page: Page): Promise<boolean> =>
  page.evaluate((attrName) => {
    const host = document.querySelector(`[${attrName}]`);
    const root = host?.shadowRoot?.querySelector(`[${attrName}]`);
    return Boolean(root?.querySelector("[data-react-grab-scan-copied]"));
  }, ATTRIBUTE_NAME);

test.describe("Render scan", () => {
  test("starts and stops the scan canvas from the toolbar", async ({ reactGrab }) => {
    await waitForToolbar(reactGrab);

    await clickScanButton(reactGrab.page);
    await expect.poll(() => isScanCanvasPresent(reactGrab.page), { timeout: 2000 }).toBe(true);
    expect(await reactGrab.getToolbarActionPressed("scan")).toBe(true);

    await clickScanButton(reactGrab.page);
    await expect.poll(() => isScanCanvasPresent(reactGrab.page), { timeout: 2000 }).toBe(false);
    expect(await reactGrab.getToolbarActionPressed("scan")).toBe(false);
  });

  test("copies a trace and shows the Copied toast on stop", async ({ reactGrab }) => {
    await waitForToolbar(reactGrab);

    await clickScanButton(reactGrab.page);
    // Force a React commit so the trace is non-empty (no trace -> no toast).
    await reactGrab.page.getByTestId("add-element-button").click();

    await clickScanButton(reactGrab.page);
    await expect.poll(() => isScanCopiedVisible(reactGrab.page), { timeout: 2000 }).toBe(true);
  });
});
