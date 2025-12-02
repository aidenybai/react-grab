import type { Theme, DeepPartial } from "./types.js";

export const DEFAULT_THEME: Required<Theme> = {
  enabled: true,
  hue: 0,
  selectionBox: {
    enabled: true,
    color: undefined,
    borderRadius: undefined,
  },
  dragBox: {
    enabled: true,
    color: undefined,
  },
  grabbedBoxes: {
    enabled: true,
    color: undefined,
  },
  elementLabel: {
    enabled: true,
    backgroundColor: undefined,
    textColor: undefined,
    borderColor: undefined,
    padding: undefined,
    cursorOffset: undefined,
  },
  successLabels: {
    enabled: true,
  },
  crosshair: {
    enabled: true,
    color: undefined,
  },
  inputOverlay: {
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
    enabled: partialTheme.selectionBox?.enabled ?? baseTheme.selectionBox.enabled,
    color: partialTheme.selectionBox?.color ?? baseTheme.selectionBox.color,
    borderRadius: partialTheme.selectionBox?.borderRadius ?? baseTheme.selectionBox.borderRadius,
  },
  dragBox: {
    enabled: partialTheme.dragBox?.enabled ?? baseTheme.dragBox.enabled,
    color: partialTheme.dragBox?.color ?? baseTheme.dragBox.color,
  },
  grabbedBoxes: {
    enabled: partialTheme.grabbedBoxes?.enabled ?? baseTheme.grabbedBoxes.enabled,
    color: partialTheme.grabbedBoxes?.color ?? baseTheme.grabbedBoxes.color,
  },
  elementLabel: {
    enabled: partialTheme.elementLabel?.enabled ?? baseTheme.elementLabel.enabled,
    backgroundColor: partialTheme.elementLabel?.backgroundColor ?? baseTheme.elementLabel.backgroundColor,
    textColor: partialTheme.elementLabel?.textColor ?? baseTheme.elementLabel.textColor,
    borderColor: partialTheme.elementLabel?.borderColor ?? baseTheme.elementLabel.borderColor,
    padding: partialTheme.elementLabel?.padding ?? baseTheme.elementLabel.padding,
    cursorOffset: partialTheme.elementLabel?.cursorOffset ?? baseTheme.elementLabel.cursorOffset,
  },
  successLabels: {
    enabled: partialTheme.successLabels?.enabled ?? baseTheme.successLabels.enabled,
  },
  crosshair: {
    enabled: partialTheme.crosshair?.enabled ?? baseTheme.crosshair.enabled,
    color: partialTheme.crosshair?.color ?? baseTheme.crosshair.color,
  },
  inputOverlay: {
    enabled: partialTheme.inputOverlay?.enabled ?? baseTheme.inputOverlay.enabled,
  },
});

export const mergeTheme = (userTheme?: Theme): Required<Theme> =>
  userTheme ? mergeThemeWithBase(DEFAULT_THEME, userTheme) : DEFAULT_THEME;

export const deepMergeTheme = mergeThemeWithBase;
