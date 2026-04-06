import { INSPECT_MAX_PROP_VALUE_LENGTH } from "../constants.js";

const formatRaw = (value: unknown): string => {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "function") return "fn()";
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === "object") return `{${Object.keys(value).length}}`;
  return String(value);
};

export const formatPropValue = (value: unknown): string => {
  const formatted = formatRaw(value);
  if (formatted.length > INSPECT_MAX_PROP_VALUE_LENGTH) {
    return `${formatted.slice(0, INSPECT_MAX_PROP_VALUE_LENGTH - 1)}…`;
  }
  return formatted;
};
