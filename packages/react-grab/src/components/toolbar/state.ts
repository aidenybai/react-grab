import type { ToolbarState } from "../../types.js";
import { DEFAULT_ACTION_ID, TOOLBAR_DEFAULT_POSITION_RATIO } from "../../constants.js";

export type { ToolbarState };
export type SnapEdge = "top" | "bottom" | "left" | "right";

const STORAGE_KEY = "react-grab-toolbar-state";

export const loadToolbarState = (): ToolbarState | null => {
  try {
    const serializedToolbarState = localStorage.getItem(STORAGE_KEY);
    if (!serializedToolbarState) return null;

    const parsed: unknown = JSON.parse(serializedToolbarState);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    return {
      edge:
        record.edge === "top" ||
        record.edge === "bottom" ||
        record.edge === "left" ||
        record.edge === "right"
          ? record.edge
          : "bottom",
      ratio: typeof record.ratio === "number" ? record.ratio : TOOLBAR_DEFAULT_POSITION_RATIO,
      collapsed: typeof record.collapsed === "boolean" ? record.collapsed : false,
      enabled: typeof record.enabled === "boolean" ? record.enabled : true,
      defaultAction:
        typeof record.defaultAction === "string" ? record.defaultAction : DEFAULT_ACTION_ID,
    };
  } catch (error) {
    console.warn("[react-grab] Failed to load toolbar state from localStorage:", error);
  }
  return null;
};

export const saveToolbarState = (state: ToolbarState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("[react-grab] Failed to save toolbar state to localStorage:", error);
  }
};
