import type { ActivationKey } from "../types.js";
import { isMac } from "./is-mac.js";
import { keyMatchesCode } from "./key-matches-code.js";

interface ParsedModifiers {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  key: string | null;
}

const MODIFIER_MAP: Record<string, keyof Omit<ParsedModifiers, "key">> = {
  meta: "metaKey",
  cmd: "metaKey",
  command: "metaKey",
  win: "metaKey",
  windows: "metaKey",
  ctrl: "ctrlKey",
  control: "ctrlKey",
  shift: "shiftKey",
  alt: "altKey",
  option: "altKey",
  opt: "altKey",
};

const parseString = (shortcut: string): ParsedModifiers => {
  const parts = shortcut.split("+").map((part) => part.trim().toLowerCase());
  const result: ParsedModifiers = {
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    key: null,
  };

  for (const part of parts) {
    const modifierKey = MODIFIER_MAP[part];
    if (modifierKey) {
      result[modifierKey] = true;
    } else {
      result.key = part;
    }
  }

  return result;
};

export const parseActivationKey = (
  activationKey: ActivationKey,
): ((event: KeyboardEvent) => boolean) => {
  if (typeof activationKey === "function") {
    return activationKey;
  }

  const parsed = parseString(activationKey);
  const targetKey = parsed.key;

  return (event: KeyboardEvent): boolean => {
    if (targetKey === null) {
      const metaMatches = parsed.metaKey
        ? event.metaKey || event.key === "Meta"
        : true;
      const ctrlMatches = parsed.ctrlKey
        ? event.ctrlKey || event.key === "Control"
        : true;
      const shiftMatches = parsed.shiftKey
        ? event.shiftKey || event.key === "Shift"
        : true;
      const altMatches = parsed.altKey
        ? event.altKey || event.key === "Alt"
        : true;

      const allRequiredModifiersPressed =
        metaMatches && ctrlMatches && shiftMatches && altMatches;

      const requiredModifierCount = [
        parsed.metaKey,
        parsed.ctrlKey,
        parsed.shiftKey,
        parsed.altKey,
      ].filter(Boolean).length;

      const pressedModifierCount = [
        event.metaKey || event.key === "Meta",
        event.ctrlKey || event.key === "Control",
        event.shiftKey || event.key === "Shift",
        event.altKey || event.key === "Alt",
      ].filter(Boolean).length;

      return (
        allRequiredModifiersPressed &&
        pressedModifierCount >= requiredModifierCount
      );
    }

    const keyMatches =
      event.key?.toLowerCase() === targetKey ||
      keyMatchesCode(targetKey, event.code);

    const hasModifier =
      parsed.metaKey || parsed.ctrlKey || parsed.shiftKey || parsed.altKey;

    const modifiersMatch = hasModifier
      ? (parsed.metaKey ? event.metaKey : true) &&
        (parsed.ctrlKey ? event.ctrlKey : true) &&
        (parsed.shiftKey ? event.shiftKey : true) &&
        (parsed.altKey ? event.altKey : true)
      : !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

    return keyMatches && modifiersMatch;
  };
};

export const getModifiersFromActivationKey = (
  activationKey: ActivationKey | undefined,
): ParsedModifiers => {
  if (!activationKey || typeof activationKey === "function") {
    return {
      metaKey: isMac(),
      ctrlKey: !isMac(),
      shiftKey: false,
      altKey: false,
      key: null,
    };
  }
  return parseString(activationKey);
};
