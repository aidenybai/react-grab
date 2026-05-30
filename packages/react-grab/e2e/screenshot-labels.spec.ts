import { test as base, expect, type Page } from "@playwright/test";
import { test } from "./fixtures.js";

interface CanvasInspectResult {
  found: boolean;
  hasInk: boolean;
  inkPixels: number;
  width: number;
  height: number;
}

const inspectOverlayCanvasInk = async (page: Page): Promise<CanvasInspectResult> =>
  page.evaluate(async () => {
    const fallback: CanvasInspectResult = {
      found: false,
      hasInk: false,
      inkPixels: 0,
      width: 0,
      height: 0,
    };
    const host = document.querySelector("[data-react-grab]");
    const shadowRoot = host?.shadowRoot;
    if (!shadowRoot) return fallback;
    const canvas = shadowRoot.querySelector(
      "canvas[data-react-grab-overlay-canvas]",
    ) as HTMLCanvasElement | null;
    if (!canvas) return fallback;

    const ctx = canvas.getContext("2d");
    if (!ctx) return { ...fallback, found: true, width: canvas.width, height: canvas.height };

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let inkPixels = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) inkPixels++;
    }
    return {
      found: true,
      hasInk: inkPixels > 0,
      inkPixels,
      width: canvas.width,
      height: canvas.height,
    };
  });

const waitForOverlayInk = async (page: Page, shouldHaveInk: boolean): Promise<void> => {
  await page.waitForFunction(
    (expected) => {
      const host = document.querySelector("[data-react-grab]");
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return !expected;
      const canvas = shadowRoot.querySelector(
        "canvas[data-react-grab-overlay-canvas]",
      ) as HTMLCanvasElement | null;
      if (!canvas) return !expected;
      const ctx = canvas.getContext("2d");
      if (!ctx) return !expected;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let hasInk = false;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
          hasInk = true;
          break;
        }
      }
      return expected ? hasInk : !hasInk;
    },
    shouldHaveInk,
    { timeout: 2000 },
  );
};

const withPlatform = (platform: string) =>
  base.extend({
    page: async ({ page }, use) => {
      await page.addInitScript((mockedPlatform) => {
        Object.defineProperty(navigator, "platform", {
          configurable: true,
          get: () => mockedPlatform,
        });
      }, platform);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        () => (window as { __REACT_GRAB__?: unknown }).__REACT_GRAB__ !== undefined,
        undefined,
        { timeout: 8000 },
      );
      await use(page);
    },
  });

const macTest = withPlatform("MacIntel");
const windowsTest = withPlatform("Win32");
const linuxTest = withPlatform("Linux x86_64");

test.describe("Screenshot Labels - smoke", () => {
  test("overlay canvas is mounted by default", async ({ reactGrab }) => {
    const result = await inspectOverlayCanvasInk(reactGrab.page);
    expect(result.found).toBe(true);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });
});

macTest.describe("Screenshot Labels - macOS (Cmd+Shift)", () => {
  macTest("does not activate when react-grab is disabled via API", async ({ page }) => {
    await page.evaluate(() => {
      const api = (window as { __REACT_GRAB__?: { setEnabled: (enabled: boolean) => void } })
        .__REACT_GRAB__;
      api?.setEnabled(false);
    });

    await page.keyboard.down("Meta");
    await page.keyboard.down("Shift");
    await page.waitForTimeout(200);

    const result = await inspectOverlayCanvasInk(page);
    expect(result.hasInk).toBe(false);

    await page.keyboard.up("Shift");
    await page.keyboard.up("Meta");

    await page.evaluate(() => {
      const api = (window as { __REACT_GRAB__?: { setEnabled: (enabled: boolean) => void } })
        .__REACT_GRAB__;
      api?.setEnabled(true);
    });
  });

  macTest("Cmd then Shift activates labels", async ({ page }) => {
    const before = await inspectOverlayCanvasInk(page);
    expect(before.found).toBe(true);
    expect(before.hasInk).toBe(false);

    await page.keyboard.down("Meta");
    await page.keyboard.down("Shift");

    await waitForOverlayInk(page, true);
    const during = await inspectOverlayCanvasInk(page);
    expect(during.inkPixels).toBeGreaterThan(0);

    await page.keyboard.up("Shift");
    await page.keyboard.up("Meta");

    await waitForOverlayInk(page, false);
  });

  macTest("Shift then Cmd activates labels", async ({ page }) => {
    await page.keyboard.down("Shift");
    await page.keyboard.down("Meta");

    await waitForOverlayInk(page, true);

    await page.keyboard.up("Meta");
    await page.keyboard.up("Shift");

    await waitForOverlayInk(page, false);
  });

  macTest("Cmd alone does not activate", async ({ page }) => {
    await page.keyboard.down("Meta");
    await page.waitForTimeout(200);

    const result = await inspectOverlayCanvasInk(page);
    expect(result.hasInk).toBe(false);

    await page.keyboard.up("Meta");
  });

  macTest("Shift alone does not activate", async ({ page }) => {
    await page.keyboard.down("Shift");
    await page.waitForTimeout(200);

    const result = await inspectOverlayCanvasInk(page);
    expect(result.hasInk).toBe(false);

    await page.keyboard.up("Shift");
  });
});

windowsTest.describe("Screenshot Labels - Windows (Win+Shift)", () => {
  windowsTest("Win+Shift activates labels", async ({ page }) => {
    await page.keyboard.down("Meta");
    await page.keyboard.down("Shift");

    await waitForOverlayInk(page, true);

    await page.keyboard.up("Shift");
    await page.keyboard.up("Meta");

    await waitForOverlayInk(page, false);
  });

  windowsTest("Ctrl+Shift does not activate", async ({ page }) => {
    await page.keyboard.down("Control");
    await page.keyboard.down("Shift");
    await page.waitForTimeout(200);

    const result = await inspectOverlayCanvasInk(page);
    expect(result.hasInk).toBe(false);

    await page.keyboard.up("Shift");
    await page.keyboard.up("Control");
  });
});

linuxTest.describe("Screenshot Labels - Linux (PrintScreen)", () => {
  linuxTest("PrintScreen activates labels", async ({ page }) => {
    await page.keyboard.down("PrintScreen");

    await waitForOverlayInk(page, true);

    await page.keyboard.up("PrintScreen");

    await waitForOverlayInk(page, false);
  });

  linuxTest("Meta+Shift does not activate on Linux", async ({ page }) => {
    await page.keyboard.down("Meta");
    await page.keyboard.down("Shift");
    await page.waitForTimeout(200);

    const result = await inspectOverlayCanvasInk(page);
    expect(result.hasInk).toBe(false);

    await page.keyboard.up("Shift");
    await page.keyboard.up("Meta");
  });
});
