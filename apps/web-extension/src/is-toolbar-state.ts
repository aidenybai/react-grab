import type { ToolbarState } from "react-grab";

const TOOLBAR_EDGES = ["top", "bottom", "left", "right"];

export const isToolbarState = (value: unknown): value is ToolbarState => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.edge === "string" &&
    TOOLBAR_EDGES.includes(candidate.edge) &&
    typeof candidate.ratio === "number" &&
    Number.isFinite(candidate.ratio) &&
    typeof candidate.collapsed === "boolean" &&
    typeof candidate.enabled === "boolean" &&
    (candidate.defaultAction === undefined || typeof candidate.defaultAction === "string")
  );
};
