import type { ToolbarState, ToolbarMode } from "../../types.js";

export type { ToolbarState, ToolbarMode };
export type SnapEdge = "top" | "bottom" | "left" | "right";

const STORAGE_KEY = "react-grab-toolbar-state";

const VALID_EDGES: SnapEdge[] = ["top", "bottom", "left", "right"];
const VALID_MODES: ToolbarMode[] = ["off", "select", "scan"];

const isValidState = (state: unknown): state is ToolbarState => {
  if (typeof state !== "object" || state === null) return false;
  const record = state as Record<string, unknown>;
  return (
    VALID_EDGES.includes(record.edge as SnapEdge) &&
    typeof record.ratio === "number" &&
    record.ratio >= 0 &&
    record.ratio <= 1 &&
    typeof record.collapsed === "boolean" &&
    VALID_MODES.includes(record.mode as ToolbarMode)
  );
};

export const loadToolbarState = (): ToolbarState | null => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (!serializedState) return null;
    const parsedState = JSON.parse(serializedState);
    if (isValidState(parsedState)) return parsedState;
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const saveToolbarState = (state: ToolbarState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
};
