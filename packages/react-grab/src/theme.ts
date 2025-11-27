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
  inputOverlay: {
    enabled: true,
  },
};

export const mergeTheme = (userTheme?: Theme): Required<Theme> => {
  if (!userTheme) return DEFAULT_THEME;

  return {
    enabled: userTheme.enabled ?? DEFAULT_THEME.enabled,
    hue: userTheme.hue ?? DEFAULT_THEME.hue,
    selectionBox: {
      enabled: userTheme.selectionBox?.enabled ?? DEFAULT_THEME.selectionBox.enabled,
      color: userTheme.selectionBox?.color ?? DEFAULT_THEME.selectionBox.color,
      borderRadius: userTheme.selectionBox?.borderRadius ?? DEFAULT_THEME.selectionBox.borderRadius,
    },
    dragBox: {
      enabled: userTheme.dragBox?.enabled ?? DEFAULT_THEME.dragBox.enabled,
      color: userTheme.dragBox?.color ?? DEFAULT_THEME.dragBox.color,
    },
    grabbedBoxes: {
      enabled: userTheme.grabbedBoxes?.enabled ?? DEFAULT_THEME.grabbedBoxes.enabled,
      color: userTheme.grabbedBoxes?.color ?? DEFAULT_THEME.grabbedBoxes.color,
    },
    elementLabel: {
      enabled: userTheme.elementLabel?.enabled ?? DEFAULT_THEME.elementLabel.enabled,
      backgroundColor: userTheme.elementLabel?.backgroundColor ?? DEFAULT_THEME.elementLabel.backgroundColor,
      textColor: userTheme.elementLabel?.textColor ?? DEFAULT_THEME.elementLabel.textColor,
      borderColor: userTheme.elementLabel?.borderColor ?? DEFAULT_THEME.elementLabel.borderColor,
      padding: userTheme.elementLabel?.padding ?? DEFAULT_THEME.elementLabel.padding,
      cursorOffset: userTheme.elementLabel?.cursorOffset ?? DEFAULT_THEME.elementLabel.cursorOffset,
    },
    successLabels: {
      enabled: userTheme.successLabels?.enabled ?? DEFAULT_THEME.successLabels.enabled,
    },
    inputOverlay: {
      enabled: userTheme.inputOverlay?.enabled ?? DEFAULT_THEME.inputOverlay.enabled,
    },
  };
};

export const deepMergeTheme = (baseTheme: Required<Theme>, partialTheme: DeepPartial<Theme>): Required<Theme> => {
  return {
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
    inputOverlay: {
      enabled: partialTheme.inputOverlay?.enabled ?? baseTheme.inputOverlay.enabled,
    },
  };
};
