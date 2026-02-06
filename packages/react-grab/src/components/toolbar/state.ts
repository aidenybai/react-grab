import type { ToolbarState } from "../../types.js";

export type { ToolbarState };
export type SnapEdge = "top" | "bottom" | "left" | "right";

const STORAGE_KEY = "react-grab-toolbar-state";

export const loadToolbarState = (
  persistToolbarState = true,
): ToolbarState | null => {
  if (!persistToolbarState) return null;
  try {
    const serializedToolbarState = localStorage.getItem(STORAGE_KEY);
    if (!serializedToolbarState) return null;

    const partialToolbarState = JSON.parse(
      serializedToolbarState,
    ) as Partial<ToolbarState>;
    return {
      edge: partialToolbarState.edge ?? "bottom",
      ratio: partialToolbarState.ratio ?? 0.5,
      collapsed: partialToolbarState.collapsed ?? false,
      enabled: partialToolbarState.enabled ?? true,
    };
  } catch (error) {
    console.warn(
      "[react-grab] Failed to load toolbar state from localStorage:",
      error,
    );
  }
  return null;
};

export const saveToolbarState = (
  state: ToolbarState,
  persistToolbarState = true,
): void => {
  if (!persistToolbarState) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn(
      "[react-grab] Failed to save toolbar state to localStorage:",
      error,
    );
  }
};
