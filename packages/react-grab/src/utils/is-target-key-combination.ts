import { isCLikeKey } from "./is-c-like-key.js";
import { isMac } from "./is-mac.js";
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

  const hasPlatformModifier = isMac() ? event.metaKey : event.ctrlKey;
  const hasOnlyPlatformModifier =
    hasPlatformModifier && !event.shiftKey && !event.altKey;
  return Boolean(
    event.key && hasOnlyPlatformModifier && isCLikeKey(event.key, event.code),
  );
};
