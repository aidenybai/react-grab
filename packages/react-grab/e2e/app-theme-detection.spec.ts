import { test, expect, type ReactGrabPageObject } from "./fixtures.js";

// react-grab paints its overlay in the *inverse* of the detected app theme so it
// stays legible. The host therefore carries `data-rg-theme="dark"` on a light app
// and `data-rg-theme="light"` on a dark app.
const OVERLAY_THEME_ON_LIGHT_APP = "dark";
const OVERLAY_THEME_ON_DARK_APP = "light";

const waitForOverlayTheme = async (
  reactGrab: ReactGrabPageObject,
  expectedTheme: string,
): Promise<string | null> => {
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

const resolveOverlayThemeForBackground = async (
  reactGrab: ReactGrabPageObject,
  backgroundColor: string,
  expectedTheme: string,
): Promise<string | null> => {
  await reactGrab.page.evaluate((color) => {
    document.documentElement.classList.remove("dark", "light");
    document.body.style.backgroundColor = color;
  }, backgroundColor);

  return waitForOverlayTheme(reactGrab, expectedTheme);
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

    const overlayTheme = await resolveOverlayThemeForBackground(
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

    const overlayTheme = await resolveOverlayThemeForBackground(
      reactGrab,
      "oklch(0.145 0 0)",
      OVERLAY_THEME_ON_DARK_APP,
    );

    expect(overlayTheme).toBe(OVERLAY_THEME_ON_DARK_APP);
  });

  // `color-scheme: light dark` advertises support for both schemes; the active
  // one follows the OS preference, not the token order. Previously the first
  // token ("light") was always returned, mis-detecting dark-OS visitors.
  test("defers to a dark OS preference when color-scheme allows both schemes", async ({
    reactGrab,
  }) => {
    await reactGrab.page.emulateMedia({ colorScheme: "dark" });
    await reactGrab.page.evaluate(() => {
      document.documentElement.style.colorScheme = "light dark";
    });

    expect(await waitForOverlayTheme(reactGrab, OVERLAY_THEME_ON_DARK_APP)).toBe(
      OVERLAY_THEME_ON_DARK_APP,
    );
  });

  test("defers to a light OS preference when color-scheme allows both schemes", async ({
    reactGrab,
  }) => {
    await reactGrab.page.emulateMedia({ colorScheme: "light" });
    await reactGrab.page.evaluate(() => {
      document.documentElement.style.colorScheme = "dark light";
    });

    expect(await waitForOverlayTheme(reactGrab, OVERLAY_THEME_ON_LIGHT_APP)).toBe(
      OVERLAY_THEME_ON_LIGHT_APP,
    );
  });

  test("honors a single-value color-scheme that forces dark against a light OS", async ({
    reactGrab,
  }) => {
    await reactGrab.page.emulateMedia({ colorScheme: "light" });
    await reactGrab.page.evaluate(() => {
      document.documentElement.style.colorScheme = "dark";
    });

    expect(await waitForOverlayTheme(reactGrab, OVERLAY_THEME_ON_DARK_APP)).toBe(
      OVERLAY_THEME_ON_DARK_APP,
    );
  });

  // A page with no theme marker, no painted background, and the default
  // `color-scheme: normal` renders a white UA canvas regardless of the OS
  // preference - the browser only paints a dark canvas when the page opts into a
  // scheme that lists `dark`. Such a page must be treated as light, not
  // misclassified by `prefers-color-scheme`.
  test("treats an undeclared transparent page as light under a dark OS preference", async ({
    reactGrab,
  }) => {
    await reactGrab.page.emulateMedia({ colorScheme: "dark" });
    await reactGrab.page.evaluate(() => {
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.style.colorScheme = "";
      document.body.style.colorScheme = "";
      document.documentElement.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
    });

    expect(await waitForOverlayTheme(reactGrab, OVERLAY_THEME_ON_LIGHT_APP)).toBe(
      OVERLAY_THEME_ON_LIGHT_APP,
    );
  });

  // Only the root element's `color-scheme` governs the UA canvas backdrop, so a
  // dual scheme declared on <body> (with <html> left `normal`) does NOT make the
  // canvas follow the OS - it stays light. The OS preference must be ignored here.
  test("ignores a dual color-scheme on body when the root element stays normal", async ({
    reactGrab,
  }) => {
    await reactGrab.page.emulateMedia({ colorScheme: "dark" });
    await reactGrab.page.evaluate(() => {
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.style.colorScheme = "";
      document.documentElement.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
      document.body.style.colorScheme = "light dark";
    });

    expect(await waitForOverlayTheme(reactGrab, OVERLAY_THEME_ON_LIGHT_APP)).toBe(
      OVERLAY_THEME_ON_LIGHT_APP,
    );
  });

  // Some apps (and a few Bootstrap/MUI setups) mark the theme on <body> rather
  // than <html>; the previous detector only inspected the document element.
  test("honors a theme marker set on the body element", async ({ reactGrab }) => {
    await reactGrab.page.emulateMedia({ colorScheme: "light" });
    await reactGrab.page.evaluate(() => {
      document.documentElement.classList.remove("dark", "light");
      document.body.classList.add("dark");
    });

    expect(await waitForOverlayTheme(reactGrab, OVERLAY_THEME_ON_DARK_APP)).toBe(
      OVERLAY_THEME_ON_DARK_APP,
    );
  });
});
