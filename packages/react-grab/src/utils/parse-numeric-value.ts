import { PIXELS_PER_REM } from "../constants.js";

export interface NumericValue {
  value: number;
  unit: string;
}

export const parseNumericValue = (cssValueString: string): NumericValue | null => {
  const trimmed = cssValueString.trim();
  if (!trimmed || trimmed === "auto" || trimmed === "normal" || trimmed === "none") return null;

  const parsedNumber = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsedNumber)) return null;

  if (trimmed.endsWith("%")) return { value: parsedNumber, unit: "%" };
  if (trimmed.endsWith("rem")) return { value: parsedNumber * PIXELS_PER_REM, unit: "px" };
  if (trimmed.endsWith("em")) return { value: parsedNumber * PIXELS_PER_REM, unit: "px" };
  if (trimmed.endsWith("px")) return { value: parsedNumber, unit: "px" };
  return { value: parsedNumber, unit: "" };
};
