import type { Options } from "../types.js";
import { getModifiersFromActivationKey } from "../utils/parse-activation-key.js";

interface ModifierKeys {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export const getRequiredModifiers = (options: Options): ModifierKeys => {
  const modifiers = getModifiersFromActivationKey(options.activationKey);
  return {
    metaKey: modifiers.metaKey,
    ctrlKey: modifiers.ctrlKey,
    shiftKey: modifiers.shiftKey,
    altKey: modifiers.altKey,
  };
};

interface KeyboardEventClaimer {
  claimedEvents: WeakSet<KeyboardEvent>;
  originalKeyDescriptor:
    | (PropertyDescriptor & { get?: () => string })
    | undefined;
  didPatch: boolean;
  restore: () => void;
}

export const setupKeyboardEventClaimer = (): KeyboardEventClaimer => {
  const claimedEvents = new WeakSet<KeyboardEvent>();

  const originalKeyDescriptor = Object.getOwnPropertyDescriptor(
    KeyboardEvent.prototype,
    "key",
  ) as PropertyDescriptor & { get?: () => string };

  let didPatch = false;
  if (
    originalKeyDescriptor?.get &&
    !(originalKeyDescriptor.get as { __reactGrabPatched?: boolean })
      .__reactGrabPatched
  ) {
    didPatch = true;
    const originalGetter = originalKeyDescriptor.get;
    const patchedGetter = function (this: KeyboardEvent) {
      if (claimedEvents.has(this)) {
        return "";
      }
      return originalGetter.call(this);
    };
    (patchedGetter as { __reactGrabPatched?: boolean }).__reactGrabPatched =
      true;
    Object.defineProperty(KeyboardEvent.prototype, "key", {
      get: patchedGetter,
      configurable: true,
    });
  }

  const restore = () => {
    if (didPatch && originalKeyDescriptor) {
      Object.defineProperty(
        KeyboardEvent.prototype,
        "key",
        originalKeyDescriptor,
      );
    }
  };

  return {
    claimedEvents,
    originalKeyDescriptor,
    didPatch,
    restore,
  };
};
