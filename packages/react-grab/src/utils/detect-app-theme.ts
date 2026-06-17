import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "./native-raf.js";
import { parseAnyColor } from "./parse-any-color.js";
import { parseHexChannels } from "./parse-color.js";

type AppTheme = "dark" | "light";

interface ThemeWatcherResult {
  theme: AppTheme;
  cleanup: () => void;
}

const THEME_ATTRIBUTES = [
  "data-theme",
  "data-mode",
  "data-color-scheme",
  "data-bs-theme",
  "data-mui-color-scheme",
] as const;

// MUI with `colorSchemeSelector: 'data'` sets bare presence attributes
// (`data-dark` / `data-light`) instead of key=value pairs.
const PRESENCE_ATTRIBUTES: readonly { attribute: string; theme: AppTheme }[] = [
  { attribute: "data-dark", theme: "dark" },
  { attribute: "data-light", theme: "light" },
];

const LUMINANCE_DARK_THRESHOLD = 0.18;

const relativeLuminance = (red: number, green: number, blue: number): number => {
  const [linearRed, linearGreen, linearBlue] = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue;
};

// `parseAnyColor` resolves the full CSS color grammar (named/rgb/hsl/hwb via
// canvas, plus oklch via exact math) to a hex string, which `parseHexChannels`
// turns into channels - covering modern computed values like `oklch(...)` that a
// naive `rgb()` parse would miss.
const themeFromElementBackground = (element: HTMLElement): AppTheme | null => {
  const hex = parseAnyColor(getComputedStyle(element).backgroundColor);
  const channels = hex ? parseHexChannels(hex) : null;
  // A transparent background tells us nothing about the rendered theme.
  if (!channels || channels.alpha === 0) return null;
  const luminance = relativeLuminance(channels.red, channels.green, channels.blue);
  return luminance < LUMINANCE_DARK_THRESHOLD ? "dark" : "light";
};

const themeFromAttributeValue = (attributeValue: string): AppTheme | null => {
  const normalized = attributeValue.toLowerCase();
  if (normalized === "dark") return "dark";
  if (normalized === "light") return "light";
  return null;
};

// `color-scheme` only forces a theme when it lists a single value. When it
// lists both ("light dark" / "dark light") the active scheme is chosen by the
// user's OS preference and reflected in the actual paint - token order does NOT
// decide it - so we defer to luminance / prefers-color-scheme instead of
// guessing the first token.
const themeFromColorScheme = (colorSchemeValue: string): AppTheme | null => {
  const normalized = colorSchemeValue.trim().toLowerCase();
  if (!normalized || normalized === "normal" || normalized === "auto") return null;

  const tokens = normalized.split(/\s+/);
  const allowsDark = tokens.includes("dark");
  const allowsLight = tokens.includes("light");
  if (allowsDark && allowsLight) return null;
  if (allowsDark) return "dark";
  if (allowsLight) return "light";
  return null;
};

const themeFromColorSchemeOf = (element: HTMLElement): AppTheme | null => {
  const colorSchemeValue = element.style.colorScheme || getComputedStyle(element).colorScheme;
  return colorSchemeValue ? themeFromColorScheme(colorSchemeValue) : null;
};

// Most frameworks mark the theme on <html> (Tailwind, next-themes), but some
// put it on <body> (a few Bootstrap/MUI setups and hand-rolled apps), so both
// roots are inspected.
const themeFromElementMarkers = (element: HTMLElement): AppTheme | null => {
  if (element.classList.contains("dark")) return "dark";
  if (element.classList.contains("light")) return "light";

  for (const attributeName of THEME_ATTRIBUTES) {
    const attributeValue = element.getAttribute(attributeName);
    if (!attributeValue) continue;
    const result = themeFromAttributeValue(attributeValue);
    if (result) return result;
  }

  for (const { attribute, theme } of PRESENCE_ATTRIBUTES) {
    if (element.hasAttribute(attribute)) return theme;
  }

  return null;
};

const firstThemeFromRoots = (
  roots: readonly (HTMLElement | null)[],
  classify: (element: HTMLElement) => AppTheme | null,
): AppTheme | null => {
  for (const root of roots) {
    if (!root) continue;
    const theme = classify(root);
    if (theme) return theme;
  }
  return null;
};

const detectTheme = (): AppTheme => {
  // Explicit theme markers and `color-scheme` are inspected root-first; the
  // painted background is read body-first, since frameworks usually paint the
  // page background on <body> while declaring the theme on <html>.
  const rootFirst = [document.documentElement, document.body] as const;
  const bodyFirst = [document.body, document.documentElement] as const;

  return (
    firstThemeFromRoots(rootFirst, themeFromElementMarkers) ??
    firstThemeFromRoots(rootFirst, themeFromColorSchemeOf) ??
    firstThemeFromRoots(bodyFirst, themeFromElementBackground) ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
};

const invertTheme = (theme: AppTheme): AppTheme => (theme === "dark" ? "light" : "dark");

const OBSERVED_ATTRIBUTES: string[] = [
  "class",
  "style",
  ...THEME_ATTRIBUTES,
  ...PRESENCE_ATTRIBUTES.map(({ attribute }) => attribute),
];
const OBSERVER_OPTIONS: MutationObserverInit = {
  attributes: true,
  attributeFilter: OBSERVED_ATTRIBUTES,
};

export const watchAppTheme = (
  host: HTMLElement,
  onChange?: (reactGrabTheme: AppTheme) => void,
): ThemeWatcherResult => {
  let lastAppliedTheme: AppTheme | null = null;
  let pendingFrame: number | null = null;

  const applyTheme = (): AppTheme => {
    const appTheme = detectTheme();
    const reactGrabTheme = invertTheme(appTheme);
    if (reactGrabTheme !== lastAppliedTheme) {
      lastAppliedTheme = reactGrabTheme;
      host.setAttribute("data-rg-theme", reactGrabTheme);
      onChange?.(reactGrabTheme);
    }
    return reactGrabTheme;
  };

  const scheduleApplyTheme = () => {
    if (pendingFrame !== null) return;
    pendingFrame = nativeRequestAnimationFrame(() => {
      pendingFrame = null;
      applyTheme();
    });
  };

  const initialTheme = applyTheme();

  const observer = new MutationObserver(scheduleApplyTheme);
  observer.observe(document.documentElement, OBSERVER_OPTIONS);

  let bodyObserver: MutationObserver | null = null;

  if (document.body) {
    observer.observe(document.body, OBSERVER_OPTIONS);
  } else {
    // Body may not exist yet during early script execution; observe it once
    // it appears and re-evaluate (the initial background may differ from
    // the fallback used above).
    bodyObserver = new MutationObserver(() => {
      if (!document.body) return;
      bodyObserver!.disconnect();
      bodyObserver = null;
      observer.observe(document.body, OBSERVER_OPTIONS);
      applyTheme();
    });
    bodyObserver.observe(document.documentElement, { childList: true });
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", scheduleApplyTheme);

  return {
    theme: initialTheme,
    cleanup: () => {
      bodyObserver?.disconnect();
      observer.disconnect();
      mediaQuery.removeEventListener("change", scheduleApplyTheme);
      if (pendingFrame !== null) {
        nativeCancelAnimationFrame(pendingFrame);
      }
    },
  };
};
