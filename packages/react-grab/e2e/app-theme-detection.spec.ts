import { test, expect, type ReactGrabPageObject } from "./fixtures.js";

// react-grab paints its overlay in the *inverse* of the detected app theme so it
// stays legible. The host therefore carries `data-rg-theme="dark"` on a light app
// and `data-rg-theme="light"` on a dark app.
const OVERLAY_THEME_ON_LIGHT_APP = "dark";
const OVERLAY_THEME_ON_DARK_APP = "light";

const resolveOverlayTheme = async (
  reactGrab: ReactGrabPageObject,
  backgroundColor: string,
  expectedTheme: string,
): Promise<string | null> => {
  await reactGrab.page.evaluate((color) => {
    document.documentElement.classList.remove("dark", "light");
    document.body.style.backgroundColor = color;
  }, backgroundColor);

  await reactGrab.page
    .waitForFunction(
      (theme) =>
        document.querySelector("[data-react-grab]")?.getAttribute("data-rg-theme") === theme,
      expectedTheme,
      { timeout: 2000 },
    )
    .catch(() => undefined);

  return reactGrab.getOverlayHost().getAttribute("data-rg-theme");
};

test.describe("App Theme Detection", () => {
  // Regression: modern browsers serialize computed colors authored with oklch()
  // in their own color space, so the previous rgb()-only parser failed to read
  // the page background and fell back to `prefers-color-scheme`. A light page on
  // a dark-OS visitor was then mis-detected as dark.
  test("detects a light background authored in oklch even under a dark OS preference", async ({
    reactGrab,
  }) => {
    await reactGrab.page.emulateMedia({ colorScheme: "dark" });

    const overlayTheme = await resolveOverlayTheme(
      reactGrab,
      "oklch(1 0 0)",
      OVERLAY_THEME_ON_LIGHT_APP,
    );

    expect(overlayTheme).toBe(OVERLAY_THEME_ON_LIGHT_APP);
  });

  test("detects a dark background authored in oklch even under a light OS preference", async ({
    reactGrab,
  }) => {
    await reactGrab.page.emulateMedia({ colorScheme: "light" });

    const overlayTheme = await resolveOverlayTheme(
      reactGrab,
      "oklch(0.145 0 0)",
      OVERLAY_THEME_ON_DARK_APP,
    );

    expect(overlayTheme).toBe(OVERLAY_THEME_ON_DARK_APP);
  });
});
