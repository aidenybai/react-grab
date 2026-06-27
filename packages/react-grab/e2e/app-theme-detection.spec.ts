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

interface ThemeScenario {
  title: string;
  // The OS preference the scenario runs under, to prove explicit signals win
  // (or correctly defer to) `prefers-color-scheme`.
  os: "dark" | "light";
  // Runs in the browser to set up the framework's theme signal on a fresh page.
  mutate: () => void;
  expected: string;
}

// Each entry pins how one real-world framework convention (or CSS authoring
// style) must resolve. The OS is deliberately set to the *opposite* of the
// expected app theme wherever an explicit signal should override it.
const FRAMEWORK_SCENARIOS: ThemeScenario[] = [
  {
    title: "Tailwind/next-themes `.dark` class on <html>",
    os: "light",
    mutate: () => document.documentElement.classList.add("dark"),
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: "Tailwind `.light` class on <html> overrides a dark OS",
    os: "dark",
    mutate: () => document.documentElement.classList.add("light"),
    expected: OVERLAY_THEME_ON_LIGHT_APP,
  },
  {
    title: 'next-themes `data-theme="dark"` attribute',
    os: "light",
    mutate: () => document.documentElement.setAttribute("data-theme", "dark"),
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: 'case-insensitive `data-theme="DARK"`',
    os: "light",
    mutate: () => document.documentElement.setAttribute("data-theme", "DARK"),
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: 'MUI `data-mui-color-scheme="dark"`',
    os: "light",
    mutate: () => document.documentElement.setAttribute("data-mui-color-scheme", "dark"),
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: 'Bootstrap `data-bs-theme="dark"`',
    os: "light",
    mutate: () => document.documentElement.setAttribute("data-bs-theme", "dark"),
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: 'Mantine `data-mantine-color-scheme="dark"`',
    os: "light",
    mutate: () => document.documentElement.setAttribute("data-mantine-color-scheme", "dark"),
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: 'generic `data-mode="dark"`',
    os: "light",
    mutate: () => document.documentElement.setAttribute("data-mode", "dark"),
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: 'generic `data-color-scheme="dark"`',
    os: "light",
    mutate: () => document.documentElement.setAttribute("data-color-scheme", "dark"),
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: "MUI presence attribute `data-dark`",
    os: "light",
    mutate: () => document.documentElement.setAttribute("data-dark", ""),
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: "MUI presence attribute `data-light` overrides a dark OS",
    os: "dark",
    mutate: () => document.documentElement.setAttribute("data-light", ""),
    expected: OVERLAY_THEME_ON_LIGHT_APP,
  },
  {
    title: "single-value `color-scheme: light` overrides a dark OS",
    os: "dark",
    mutate: () => {
      document.documentElement.style.colorScheme = "light";
    },
    expected: OVERLAY_THEME_ON_LIGHT_APP,
  },
  {
    title: "`color-scheme: only dark` forces dark under a light OS",
    os: "light",
    mutate: () => {
      document.documentElement.style.colorScheme = "only dark";
    },
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: "shadcn CSS-variable-driven dark background on <body>",
    os: "light",
    mutate: () => {
      document.documentElement.style.setProperty("--background", "oklch(0.145 0 0)");
      document.body.style.backgroundColor = "var(--background)";
    },
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: "CSS-module-style dark background painted on <body> (hsl)",
    os: "light",
    mutate: () => {
      document.body.style.backgroundColor = "hsl(0 0% 7%)";
    },
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: "white background painted on <body> overrides a dark OS",
    os: "dark",
    mutate: () => {
      document.body.style.backgroundColor = "rgb(255, 255, 255)";
    },
    expected: OVERLAY_THEME_ON_LIGHT_APP,
  },
  {
    title: "dark background on <html> when <body> is transparent",
    os: "light",
    mutate: () => {
      document.documentElement.style.backgroundColor = "#111111";
    },
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: "root `color-scheme: light dark` defers to a dark OS via the Canvas backdrop",
    os: "dark",
    mutate: () => {
      document.documentElement.style.colorScheme = "light dark";
    },
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: "an explicit marker wins over a conflicting painted background",
    os: "light",
    mutate: () => {
      document.documentElement.classList.add("dark");
      document.body.style.backgroundColor = "rgb(255, 255, 255)";
    },
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: "a fully transparent background is ignored (falls through to light Canvas)",
    os: "dark",
    mutate: () => {
      document.body.style.backgroundColor = "rgba(0, 0, 0, 0)";
    },
    expected: OVERLAY_THEME_ON_LIGHT_APP,
  },
  {
    title: "wrapper-themed dark app: near-white root text on a transparent page resolves to dark",
    os: "light",
    mutate: () => {
      document.documentElement.style.color = "rgb(229, 229, 229)";
    },
    expected: OVERLAY_THEME_ON_DARK_APP,
  },
  {
    title: "dark root text on a transparent page stays light (defers to the Canvas backdrop)",
    os: "dark",
    mutate: () => {
      document.documentElement.style.color = "rgb(17, 17, 17)";
    },
    expected: OVERLAY_THEME_ON_LIGHT_APP,
  },
  {
    title: "light text on <body> only (root untouched) is ignored - root governs the page theme",
    os: "dark",
    mutate: () => {
      document.body.style.color = "rgb(229, 229, 229)";
    },
    expected: OVERLAY_THEME_ON_LIGHT_APP,
  },
];

test.describe("App Theme Detection - framework conventions", () => {
  for (const scenario of FRAMEWORK_SCENARIOS) {
    test(scenario.title, async ({ reactGrab }) => {
      await reactGrab.page.emulateMedia({ colorScheme: scenario.os });
      await reactGrab.page.evaluate(scenario.mutate);

      expect(await waitForOverlayTheme(reactGrab, scenario.expected)).toBe(scenario.expected);
    });
  }

  // The MutationObserver must re-derive the theme when a framework toggles the
  // marker at runtime (next-themes/Tailwind theme switchers).
  test("reacts to a runtime class toggle from dark to light", async ({ reactGrab }) => {
    await reactGrab.page.emulateMedia({ colorScheme: "light" });
    await reactGrab.page.evaluate(() => document.documentElement.classList.add("dark"));
    expect(await waitForOverlayTheme(reactGrab, OVERLAY_THEME_ON_DARK_APP)).toBe(
      OVERLAY_THEME_ON_DARK_APP,
    );

    await reactGrab.page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    });
    expect(await waitForOverlayTheme(reactGrab, OVERLAY_THEME_ON_LIGHT_APP)).toBe(
      OVERLAY_THEME_ON_LIGHT_APP,
    );
  });

  // When the page advertises both schemes, flipping the OS preference must
  // re-derive the Canvas backdrop and update the overlay live.
  test("reacts to an OS preference flip when color-scheme allows both", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => {
      document.documentElement.style.colorScheme = "light dark";
    });

    await reactGrab.page.emulateMedia({ colorScheme: "dark" });
    expect(await waitForOverlayTheme(reactGrab, OVERLAY_THEME_ON_DARK_APP)).toBe(
      OVERLAY_THEME_ON_DARK_APP,
    );

    await reactGrab.page.emulateMedia({ colorScheme: "light" });
    expect(await waitForOverlayTheme(reactGrab, OVERLAY_THEME_ON_LIGHT_APP)).toBe(
      OVERLAY_THEME_ON_LIGHT_APP,
    );
  });
});
