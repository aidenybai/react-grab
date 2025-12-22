export type SnapEdge = "top" | "bottom" | "left" | "right";

export interface DockState {
  edge: SnapEdge;
  ratio: number;
  collapsed: boolean;
}

const STORAGE_KEY = "react-grab-dock-state";

export const loadDockState = (): DockState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as DockState;
  } catch {}
  return null;
};

export const saveDockState = (state: DockState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
};
