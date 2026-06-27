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
  "data-mantine-color-scheme",
] as const;

// MUI with `colorSchemeSelector: 'data'` sets bare presence attributes
// (`data-dark` / `data-light`) instead of key=value pairs.
const PRESENCE_ATTRIBUTES: readonly { attribute: string; theme: AppTheme }[] = [
  { attribute: "data-dark", theme: "dark" },
  { attribute: "data-light", theme: "light" },
];

const LUMINANCE_DARK_THRESHOLD = 0.18;
// Text this light sits well above any light theme's (dark) body text, so it only
// appears when the app paints onto a dark surface - revealing a dark theme.
const LIGHT_TEXT_LUMINANCE_THRESHOLD = 0.6;
// Faint text composites toward the backdrop, making its own color an unreliable
// theme signal, so the foreground heuristic ignores anything more translucent.
const OPAQUE_TEXT_MIN_ALPHA = 0.5;

const getRelativeLuminance = (red: number, green: number, blue: number): number => {
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
const getColorLuminance = (color: string, minAlpha = 0): number | null => {
  const hex = parseAnyColor(color);
  const channels = hex ? parseHexChannels(hex) : null;
  // Too transparent to composite into a reliable signal - a fully transparent
  // color tells us nothing, and faint text bleeds into whatever sits behind it.
  if (!channels || channels.alpha <= minAlpha) return null;
  return getRelativeLuminance(channels.red, channels.green, channels.blue);
};

const getThemeFromBackgroundColor = (color: string): AppTheme | null => {
  const luminance = getColorLuminance(color);
  if (luminance === null) return null;
  return luminance < LUMINANCE_DARK_THRESHOLD ? "dark" : "light";
};

const getThemeFromElementBackground = (element: HTMLElement): AppTheme | null =>
  getThemeFromBackgroundColor(getComputedStyle(element).backgroundColor);

// When nothing is painted we can't read a wrapper-themed app's real backdrop,
// but its text color still betrays the intent: light text only makes sense over
// a dark surface. Read it from the root (whose used `color-scheme` governs the
// page, unlike <body> which may opt into its own), require a near-opaque color,
// and only conclude `dark` - dark text is the default even on undeclared light
// pages, so it defers to the Canvas backdrop instead.
const getThemeFromRootForegroundText = (): AppTheme | null => {
  const luminance = getColorLuminance(
    getComputedStyle(document.documentElement).color,
    OPAQUE_TEXT_MIN_ALPHA,
  );
  if (luminance === null) return null;
  return luminance > LIGHT_TEXT_LUMINANCE_THRESHOLD ? "dark" : null;
};

// When nothing on the page is painted, the visible backdrop is the UA canvas,
// whose color is exposed on no element. The `Canvas` system color resolves to
// exactly that, honoring the root element's used `color-scheme` (so it tracks
// the OS preference only when the page opted into a dark-capable scheme, and
// stays light under the default `normal`). A throwaway probe attached under
// <html> inherits the root scheme - deliberately not <body>, whose scheme does
// not drive the canvas - and reads the precise color the browser paints.
const getThemeFromCanvasBackdrop = (): AppTheme | null => {
  const probeElement = document.createElement("div");
  // Inline `!important` outranks any author `!important` rule that might target
  // the probe (e.g. a global `div { background: ... !important }`) and corrupt
  // the Canvas read.
  probeElement.style.cssText = "position:fixed;width:0;height:0;background-color:Canvas!important";
  document.documentElement.appendChild(probeElement);
  const theme = getThemeFromBackgroundColor(getComputedStyle(probeElement).backgroundColor);
  probeElement.remove();
  return theme;
};

const getThemeFromAttributeValue = (attributeValue: string): AppTheme | null => {
  const normalized = attributeValue.toLowerCase();
  if (normalized === "dark") return "dark";
  if (normalized === "light") return "light";
  return null;
};

const getColorSchemeTokens = (element: HTMLElement): readonly string[] => {
  const colorSchemeValue = element.style.colorScheme || getComputedStyle(element).colorScheme;
  return colorSchemeValue ? colorSchemeValue.trim().toLowerCase().split(/\s+/) : [];
};

// `color-scheme` only forces a theme when it lists a single value. When it lists
// both ("light dark") the active scheme follows the OS preference, not token
// order, so we defer; `normal`/`auto` list neither and likewise defer.
const getThemeFromColorScheme = (element: HTMLElement): AppTheme | null => {
  const tokens = getColorSchemeTokens(element);
  const allowsDark = tokens.includes("dark");
  const allowsLight = tokens.includes("light");
  if (allowsDark === allowsLight) return null;
  return allowsDark ? "dark" : "light";
};

// Most frameworks mark the theme on <html> (Tailwind, next-themes), but some
// put it on <body> (a few Bootstrap/MUI setups and hand-rolled apps), so both
// roots are inspected.
const getThemeFromElementMarkers = (element: HTMLElement): AppTheme | null => {
  if (element.classList.contains("dark")) return "dark";
  if (element.classList.contains("light")) return "light";

  for (const attributeName of THEME_ATTRIBUTES) {
    const attributeValue = element.getAttribute(attributeName);
    if (!attributeValue) continue;
    const markerTheme = getThemeFromAttributeValue(attributeValue);
    if (markerTheme) return markerTheme;
  }

  for (const { attribute, theme } of PRESENCE_ATTRIBUTES) {
    if (element.hasAttribute(attribute)) return theme;
  }

  return null;
};

const getFirstThemeFromRoots = (
  roots: readonly (HTMLElement | null)[],
  getThemeForElement: (element: HTMLElement) => AppTheme | null,
): AppTheme | null => {
  for (const root of roots) {
    if (!root) continue;
    const theme = getThemeForElement(root);
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

  // With nothing explicit and nothing painted, near-white root text reveals a
  // dark wrapper, then the `Canvas` backdrop is the rendered truth; `light` is
  // only a last resort if neither can be read.
  return (
    getFirstThemeFromRoots(rootFirst, getThemeFromElementMarkers) ??
    getFirstThemeFromRoots(rootFirst, getThemeFromColorScheme) ??
    getFirstThemeFromRoots(bodyFirst, getThemeFromElementBackground) ??
    getThemeFromRootForegroundText() ??
    getThemeFromCanvasBackdrop() ??
    "light"
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
