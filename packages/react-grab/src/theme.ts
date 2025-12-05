import type { Theme, DeepPartial } from "./types.js";

export const DEFAULT_THEME: Required<Theme> = {
  enabled: true,
  hue: 0,
  selectionBox: {
    enabled: true,
  },
  dragBox: {
    enabled: true,
  },
  grabbedBoxes: {
    enabled: true,
  },
  elementLabel: {
    enabled: true,
  },
  crosshair: {
    enabled: true,
  },
};

const mergeThemeWithBase = (
  baseTheme: Required<Theme>,
  partialTheme: DeepPartial<Theme>,
): Required<Theme> => ({
  enabled: partialTheme.enabled ?? baseTheme.enabled,
  hue: partialTheme.hue ?? baseTheme.hue,
  selectionBox: {
    enabled:
      partialTheme.selectionBox?.enabled ?? baseTheme.selectionBox.enabled,
  },
  dragBox: {
    enabled: partialTheme.dragBox?.enabled ?? baseTheme.dragBox.enabled,
  },
  grabbedBoxes: {
    enabled:
      partialTheme.grabbedBoxes?.enabled ?? baseTheme.grabbedBoxes.enabled,
  },
  elementLabel: {
    enabled:
      partialTheme.elementLabel?.enabled ?? baseTheme.elementLabel.enabled,
  },
  crosshair: {
    enabled: partialTheme.crosshair?.enabled ?? baseTheme.crosshair.enabled,
  },
});

export const mergeTheme = (userTheme?: Theme): Required<Theme> =>
  userTheme ? mergeThemeWithBase(DEFAULT_THEME, userTheme) : DEFAULT_THEME;

export const deepMergeTheme = mergeThemeWithBase;
