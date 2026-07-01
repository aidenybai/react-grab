import { HISTORY_MAX_VALUE_LENGTH } from "../constants.js";

const HISTORY_MAX_OBJECT_KEYS = 4;
const HISTORY_MAX_ARRAY_ITEMS = 4;

const truncate = (text: string): string =>
  text.length > HISTORY_MAX_VALUE_LENGTH ? `${text.slice(0, HISTORY_MAX_VALUE_LENGTH - 1)}…` : text;

// Depth-0 label for a nested value: primitives are shown literally, everything
// composite collapses to its type so nesting can't blow up the string.
const formatScalar = (value: unknown): string => {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const valueType = typeof value;
  if (valueType === "string") return JSON.stringify(value);
  if (valueType === "number" || valueType === "boolean" || valueType === "bigint") {
    return String(value);
  }
  if (valueType === "function") {
    const name = (value as { name?: string }).name;
    return name ? `ƒ ${name}` : "ƒ";
  }
  if (valueType === "symbol") return String(value);
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (value instanceof Element) return `<${value.tagName.toLowerCase()}>`;
  const constructorName = (value as { constructor?: { name?: string } }).constructor?.name;
  return constructorName && constructorName !== "Object" ? constructorName : "{…}";
};

// Turns an arbitrary fiber prop/state value into a short, human-readable label
// for the time-travel panel. Objects and arrays get one level of shallow
// expansion so two renders can actually be told apart (e.g. `{opacity: 0}` vs
// `{opacity: 1}`) instead of collapsing to an identical opaque shape. Never
// throws: any getter or circular structure falls back to its type so recording
// a commit can't crash the host app.
export const formatHistoryValue = (value: unknown): string => {
  try {
    if (value === null || value === undefined || typeof value !== "object") {
      return truncate(formatScalar(value));
    }

    if (value instanceof Element) return truncate(`<${value.tagName.toLowerCase()}>`);

    if (Array.isArray(value)) {
      if (value.length === 0) return "[]";
      if (value.length > HISTORY_MAX_ARRAY_ITEMS) return `Array(${value.length})`;
      return truncate(`[${value.map((item) => formatScalar(item)).join(", ")}]`);
    }

    const constructorName = (value as { constructor?: { name?: string } }).constructor?.name;
    if (constructorName && constructorName !== "Object") return truncate(constructorName);

    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";
    const shownKeys = keys.slice(0, HISTORY_MAX_OBJECT_KEYS);
    const entries = shownKeys.map(
      (key) => `${key}: ${formatScalar((value as Record<string, unknown>)[key])}`,
    );
    if (keys.length > HISTORY_MAX_OBJECT_KEYS) entries.push("…");
    return truncate(`{ ${entries.join(", ")} }`);
  } catch {
    return "(unserializable)";
  }
};
