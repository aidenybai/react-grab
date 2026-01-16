export type SnapEdge = "top" | "bottom" | "left" | "right";

export interface ToolbarState {
  edge: SnapEdge;
  ratio: number;
  collapsed: boolean;
  enabled: boolean;
}

const STORAGE_KEY = "react-grab-toolbar-state";

export const loadToolbarState = (): ToolbarState | null => {
  try {
    const serializedToolbarState = localStorage.getItem(STORAGE_KEY);
    if (serializedToolbarState) {
      const partialToolbarState = JSON.parse(
        serializedToolbarState,
      ) as Partial<ToolbarState>;
      return {
        edge: partialToolbarState.edge ?? "bottom",
        ratio: partialToolbarState.ratio ?? 0.5,
        collapsed: partialToolbarState.collapsed ?? false,
        enabled: partialToolbarState.enabled ?? true,
      };
    }
  } catch {}
  return null;
};

export const saveToolbarState = (state: ToolbarState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
};
