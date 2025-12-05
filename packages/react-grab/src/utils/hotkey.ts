import { isCLikeKey } from "./is-c-like-key.js";
import { MODIFIER_KEYS } from "../constants.js";
import type { ActivationKey } from "../types.js";

export const keyMatchesCode = (targetKey: string, code: string): boolean => {
  const normalizedTarget = targetKey.toLowerCase();
  if (code.startsWith("Key")) {
    return code.slice(3).toLowerCase() === normalizedTarget;
  }
  if (code.startsWith("Digit")) {
    return code.slice(5) === normalizedTarget;
  }
  return false;
};

interface HotkeyOptions {
  activationShortcut?: (event: KeyboardEvent) => boolean;
  activationKey?: ActivationKey;
}

export const isTargetKeyCombination = (
  event: KeyboardEvent,
  options: HotkeyOptions,
): boolean => {
  if (options.activationShortcut) {
    return options.activationShortcut(event);
  }

  if (options.activationKey) {
    const { key, metaKey, ctrlKey, shiftKey, altKey } = options.activationKey;
    const isModifierOnly = !key;

    if (isModifierOnly) {
      if (!MODIFIER_KEYS.includes(event.key)) return false;

      const metaMatches = metaKey
        ? event.metaKey || event.key === "Meta"
        : true;
      const ctrlMatches = ctrlKey
        ? event.ctrlKey || event.key === "Control"
        : true;
      const shiftMatches = shiftKey
        ? event.shiftKey || event.key === "Shift"
        : true;
      const altMatches = altKey ? event.altKey || event.key === "Alt" : true;

      const allRequiredModifiersPressed =
        metaMatches && ctrlMatches && shiftMatches && altMatches;
      const requiredModifierCount = [metaKey, ctrlKey, shiftKey, altKey].filter(
        Boolean,
      ).length;
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
      event.key?.toLowerCase() === key.toLowerCase() ||
      keyMatchesCode(key, event.code);
    const hasModifier = metaKey || ctrlKey || shiftKey || altKey;
    const modifiersMatch = hasModifier
      ? (metaKey ? event.metaKey : true) &&
        (ctrlKey ? event.ctrlKey : true) &&
        (shiftKey ? event.shiftKey : true) &&
        (altKey ? event.altKey : true)
      : event.metaKey || event.ctrlKey;
    return keyMatches && modifiersMatch;
  }

  return (event.metaKey || event.ctrlKey) && isCLikeKey(event.key, event.code);
};
