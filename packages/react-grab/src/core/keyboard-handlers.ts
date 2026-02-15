import type { Options } from "../types.js";
import { getModifiersFromActivationKey } from "../utils/parse-activation-key.js";

interface ModifierKeys {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export const getRequiredModifiers = (options: Options): ModifierKeys => {
  const { metaKey, ctrlKey, shiftKey, altKey } = getModifiersFromActivationKey(
    options.activationKey,
  );
  return { metaKey, ctrlKey, shiftKey, altKey };
};

interface PatchableGetter {
  (this: KeyboardEvent): string;
  __reactGrabPatched?: boolean;
}

interface KeyDescriptor extends PropertyDescriptor {
  get?: PatchableGetter;
}

interface KeyboardEventClaimer {
  claimedEvents: WeakSet<KeyboardEvent>;
  originalKeyDescriptor: KeyDescriptor | undefined;
  didPatch: boolean;
  restore: () => void;
}

export const setupKeyboardEventClaimer = (): KeyboardEventClaimer => {
  const claimedEvents = new WeakSet<KeyboardEvent>();

  const originalKeyDescriptor = Object.getOwnPropertyDescriptor(
    KeyboardEvent.prototype,
    "key",
  ) as KeyDescriptor | undefined;

  let didPatch = false;
  if (
    originalKeyDescriptor?.get &&
    !originalKeyDescriptor.get.__reactGrabPatched
  ) {
    didPatch = true;
    const originalGetter = originalKeyDescriptor.get;
    const patchedGetter: PatchableGetter = function (this: KeyboardEvent) {
      if (claimedEvents.has(this)) {
        return "";
      }
      return originalGetter.call(this);
    };
    patchedGetter.__reactGrabPatched = true;
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
