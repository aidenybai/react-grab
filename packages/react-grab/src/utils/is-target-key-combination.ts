import { isCLikeKey } from "./is-c-like-key.js";
import { parseActivationKey } from "./parse-activation-key.js";
import type { ActivationKey } from "../types.js";

interface HotkeyOptions {
  activationKey?: ActivationKey;
}

export const isTargetKeyCombination = (
  event: KeyboardEvent,
  options: HotkeyOptions,
): boolean => {
  if (options.activationKey) {
    const matcher = parseActivationKey(options.activationKey);
    return matcher(event);
  }

  const hasOnlyMetaOrCtrl =
    (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey;
  return Boolean(
    event.key && hasOnlyMetaOrCtrl && isCLikeKey(event.key, event.code),
  );
};
