import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "./native-raf.js";

type AppTheme = "dark" | "light";

const isAppTheme = (token: string): token is AppTheme => token === "dark" || token === "light";

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

// Matches both legacy comma-separated (Chrome <101, Firefox <113) and modern
// space-separated (Chrome 101+, Firefox 113+, Safari 15+) computed rgb/rgba.
//   legacy:  rgba(18, 18, 18, 1)  or  rgb(18, 18, 18)
//   modern:  rgb(18 18 18)        or  rgb(18 18 18 / 1)
const RGB_PATTERN =
  /rgba?\(\s*(\d+(?:\.\d+)?)\s*[,\s]\s*(\d+(?:\.\d+)?)\s*[,\s]\s*(\d+(?:\.\d+)?)(?:\s*[,/]\s*(\d+(?:\.\d+)?))?\s*\)/;

const isTransparent = (backgroundColor: string): boolean => {
  if (backgroundColor === "transparent") return true;
  const rgbMatch = backgroundColor.match(RGB_PATTERN);
  if (!rgbMatch) return false;
  const alpha = rgbMatch[4];
  return alpha !== undefined && Number(alpha) === 0;
};

const relativeLuminance = (red: number, green: number, blue: number): number => {
  const [linearRed, linearGreen, linearBlue] = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue;
};

const themeFromBackgroundLuminance = (): AppTheme | null => {
  const target = document.body ?? document.documentElement;
  const backgroundColor = getComputedStyle(target).backgroundColor;
  if (!backgroundColor || isTransparent(backgroundColor)) {
    return null;
  }
  const rgbMatch = backgroundColor.match(RGB_PATTERN);
  if (!rgbMatch) return null;
  const luminance = relativeLuminance(
    Number(rgbMatch[1]),
    Number(rgbMatch[2]),
    Number(rgbMatch[3]),
  );
  return luminance < LUMINANCE_DARK_THRESHOLD ? "dark" : "light";
};

const themeFromAttributeValue = (attributeValue: string): AppTheme | null => {
  const normalized = attributeValue.toLowerCase();
  if (normalized === "dark") return "dark";
  if (normalized === "light") return "light";
  return null;
};

// CSS color-scheme can be multi-value ("light dark" or "dark light").
// First listed value is the preferred scheme; fall back to includes-check
// for single-value strings.
const themeFromColorScheme = (colorSchemeValue: string): AppTheme | null => {
  const normalized = colorSchemeValue.trim().toLowerCase();
  if (!normalized || normalized === "normal" || normalized === "auto") return null;

  const tokens = normalized.split(/\s+/);
  return tokens.find(isAppTheme) ?? null;
};

const detectTheme = (): AppTheme => {
  const htmlElement = document.documentElement;

  if (htmlElement.classList.contains("dark")) return "dark";
  if (htmlElement.classList.contains("light")) return "light";

  for (const attributeName of THEME_ATTRIBUTES) {
    const attributeValue = htmlElement.getAttribute(attributeName);
    if (!attributeValue) continue;
    const result = themeFromAttributeValue(attributeValue);
    if (result) return result;
  }

  for (const { attribute, theme } of PRESENCE_ATTRIBUTES) {
    if (htmlElement.hasAttribute(attribute)) return theme;
  }

  const colorSchemeProperty =
    htmlElement.style.colorScheme || getComputedStyle(htmlElement).colorScheme;
  if (colorSchemeProperty) {
    const result = themeFromColorScheme(colorSchemeProperty);
    if (result) return result;
  }

  const luminanceResult = themeFromBackgroundLuminance();
  if (luminanceResult) return luminanceResult;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
