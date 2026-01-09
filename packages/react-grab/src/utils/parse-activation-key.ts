import type { ActivationKey } from "../types.js";

/**
 * Map of modifier aliases to their canonical KeyboardEvent property names.
 * Includes common abbreviations and platform-specific names.
 */
export const MODIFIER_MAP: Record<string, keyof Omit<ActivationKey, "key">> = {
  // Meta/Command/Windows key
  meta: "metaKey",
  cmd: "metaKey",
  command: "metaKey",
  win: "metaKey",
  windows: "metaKey",
  super: "metaKey",

  // Control key
  ctrl: "ctrlKey",
  control: "ctrlKey",

  // Shift key
  shift: "shiftKey",

  // Alt/Option key
  alt: "altKey",
  opt: "altKey",
  option: "altKey",
};

/**
 * Parses a string representation of an activation key combination into an ActivationKey object.
 *
 * @example
 * parseActivationKeyString("Win+K") // { metaKey: true, key: "k" }
 * parseActivationKeyString("Cmd+Shift+G") // { metaKey: true, shiftKey: true, key: "g" }
 * parseActivationKeyString("Opt+Alt") // { altKey: true } (modifier-only)
 * parseActivationKeyString("Ctrl+C") // { ctrlKey: true, key: "c" }
 *
 * @param keyString - A string like "Win+K", "Cmd+Shift+G", "Opt+K", etc.
 * @returns An ActivationKey object with the parsed modifiers and key
 */
export const parseActivationKeyString = (
  keyString: string,
): ActivationKey | null => {
  if (!keyString || typeof keyString !== "string") {
    return null;
  }

  const parts = keyString.split("+").map((part) => part.trim().toLowerCase());
  if (parts.length === 0) {
    return null;
  }

  const result: ActivationKey = {};
  let hasValidPart = false;

  for (const part of parts) {
    const modifierKey = MODIFIER_MAP[part];
    if (modifierKey) {
      result[modifierKey] = true;
      hasValidPart = true;
    } else if (part.length > 0) {
      // If it's not a modifier, treat it as the key value
      // Only set the key if we haven't already set one
      if (!result.key) {
        result.key = part;
        hasValidPart = true;
      }
    }
  }

  return hasValidPart ? result : null;
};

/**
 * Normalizes an activation key input to a consistent ActivationKey object.
 * Accepts either a string (e.g., "Win+K") or an ActivationKey object.
 *
 * @param input - Either a string like "Win+K" or an ActivationKey object
 * @returns An ActivationKey object, or null if the input is invalid
 */
export const normalizeActivationKey = (
  input: string | ActivationKey | undefined | null,
): ActivationKey | null => {
  if (!input) {
    return null;
  }

  if (typeof input === "string") {
    return parseActivationKeyString(input);
  }

  // If it's already an object, validate it has at least one valid property
  if (typeof input === "object") {
    const hasModifier =
      input.metaKey || input.ctrlKey || input.shiftKey || input.altKey;
    const hasKey = Boolean(input.key);
    if (hasModifier || hasKey) {
      return input;
    }
  }

  return null;
};
