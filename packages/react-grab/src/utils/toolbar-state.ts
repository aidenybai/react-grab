export type SnapEdge = "top" | "bottom" | "left" | "right";

export interface ToolbarState {
  edge: SnapEdge;
  ratio: number;
  collapsed: boolean;
}

const STORAGE_KEY = "react-grab-toolbar-state";

export const loadToolbarState = (): ToolbarState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as ToolbarState;
  } catch {}
  return null;
};

export const saveToolbarState = (state: ToolbarState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
};
