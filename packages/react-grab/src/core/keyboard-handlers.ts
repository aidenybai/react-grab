import type { Options } from "../types.js";
import { detectPlatform } from "../utils/detect-platform.js";

interface ModifierKeys {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export const getRequiredModifiers = (options: Options): ModifierKeys => {
  if (options.activationKey) {
    const { metaKey, ctrlKey, shiftKey, altKey } = options.activationKey;
    return {
      metaKey: Boolean(metaKey),
      ctrlKey: Boolean(ctrlKey),
      shiftKey: Boolean(shiftKey),
      altKey: Boolean(altKey),
    };
  }

  const { isMac } = detectPlatform();

  if (isMac) {
    return {
      metaKey: true,
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
    };
  }

  return {
    metaKey: false,
    ctrlKey: true,
    shiftKey: true,
    altKey: false,
  };
};

export interface KeyboardEventClaimer {
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
