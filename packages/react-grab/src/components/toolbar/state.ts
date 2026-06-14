import type { ToolbarState } from "../../types.js";
import { DEFAULT_ACTION_ID, TOOLBAR_DEFAULT_POSITION_RATIO } from "../../constants.js";
import { IS_DEMO } from "../../utils/runtime-mode.js";

export type { ToolbarState };
export type SnapEdge = "top" | "bottom" | "left" | "right";

const STORAGE_KEY = "react-grab-toolbar-state";

export const DEFAULT_TOOLBAR_STATE: ToolbarState = {
  edge: "bottom",
  ratio: TOOLBAR_DEFAULT_POSITION_RATIO,
  collapsed: false,
  enabled: true,
  defaultAction: DEFAULT_ACTION_ID,
};

export const loadToolbarState = (): ToolbarState | null => {
  // Demo mode is display-only and must stay deterministic, so it never reads the
  // visitor's persisted toolbar prefs - it always starts from the defaults.
  if (IS_DEMO) return null;
  try {
    const serializedToolbarState = localStorage.getItem(STORAGE_KEY);
    if (!serializedToolbarState) return null;

    const parsed: unknown = JSON.parse(serializedToolbarState);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    const collapsed = typeof record.collapsed === "boolean" ? record.collapsed : false;
    return {
      edge:
        record.edge === "top" ||
        record.edge === "bottom" ||
        record.edge === "left" ||
        record.edge === "right"
          ? record.edge
          : DEFAULT_TOOLBAR_STATE.edge,
      ratio: typeof record.ratio === "number" ? record.ratio : DEFAULT_TOOLBAR_STATE.ratio,
      collapsed,
      enabled: !collapsed,
      defaultAction:
        typeof record.defaultAction === "string"
          ? record.defaultAction
          : DEFAULT_TOOLBAR_STATE.defaultAction,
    };
  } catch (error) {
    console.warn("[react-grab] Failed to load toolbar state from localStorage:", error);
  }
  return null;
};

export const saveToolbarState = (state: ToolbarState): void => {
  // Demo mode never writes to the visitor's clipboard or storage; persisting
  // here would clobber the real toolbar prefs of anyone running React Grab on
  // the same origin.
  if (IS_DEMO) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("[react-grab] Failed to save toolbar state to localStorage:", error);
  }
};
