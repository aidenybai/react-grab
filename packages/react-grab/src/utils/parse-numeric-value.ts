import { PIXELS_PER_REM } from "../constants.js";

export interface NumericValue {
  value: number;
  unit: string;
}

export const parseNumericValue = (raw: string): NumericValue | null => {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "auto" || trimmed === "normal" || trimmed === "none") return null;

  const numeric = Number.parseFloat(trimmed);
  if (!Number.isFinite(numeric)) return null;

  if (trimmed.endsWith("%")) return { value: numeric, unit: "%" };
  if (trimmed.endsWith("rem")) return { value: numeric * PIXELS_PER_REM, unit: "px" };
  if (trimmed.endsWith("em")) return { value: numeric * PIXELS_PER_REM, unit: "px" };
  if (trimmed.endsWith("px")) return { value: numeric, unit: "px" };
  return { value: numeric, unit: "" };
};
