import { HISTORY_MAX_VALUE_LENGTH } from "../constants.js";

const truncate = (text: string): string =>
  text.length > HISTORY_MAX_VALUE_LENGTH ? `${text.slice(0, HISTORY_MAX_VALUE_LENGTH - 1)}…` : text;

// Turns an arbitrary fiber prop/state value into a short, human-readable label
// for the time-travel panel. Never throws: any getter or circular structure
// falls back to its type so recording a commit can't crash the host app.
export const formatHistoryValue = (value: unknown): string => {
  try {
    if (value === null) return "null";
    if (value === undefined) return "undefined";

    const valueType = typeof value;
    if (valueType === "string") return truncate(JSON.stringify(value));
    if (valueType === "number" || valueType === "boolean" || valueType === "bigint") {
      return truncate(String(value));
    }
    if (valueType === "function") {
      const name = (value as { name?: string }).name;
      return name ? `ƒ ${name}` : "ƒ";
    }
    if (valueType === "symbol") return truncate(String(value));

    if (Array.isArray(value)) return truncate(`Array(${value.length})`);

    if (value instanceof Element) {
      return truncate(`<${value.tagName.toLowerCase()}>`);
    }

    const constructorName = (value as { constructor?: { name?: string } }).constructor?.name;
    if (constructorName && constructorName !== "Object") {
      return truncate(constructorName);
    }

    const keys = Object.keys(value as object);
    return truncate(`{${keys.slice(0, 4).join(", ")}${keys.length > 4 ? ", …" : ""}}`);
  } catch {
    return "(unserializable)";
  }
};
