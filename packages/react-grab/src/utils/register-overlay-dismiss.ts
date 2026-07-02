import type { OverlayDismissSource } from "../types.js";
import { ignoreRealInput } from "./runtime-mode.js";
import { isEventFromOverlay } from "./is-event-from-overlay.js";
import { isKeyboardEventTriggeredByInput } from "./is-keyboard-event-triggered-by-input.js";
import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "./native-raf.js";

interface RegisterOverlayDismissOptions {
  isOpen: () => boolean;
  onDismiss: (source: OverlayDismissSource) => void;
  shouldIgnoreKeyboardEvent?: (event: KeyboardEvent) => boolean;
  shouldIgnoreInputEvents?: boolean;
  shouldIgnoreRightClick?: boolean;
}

export const registerOverlayDismiss = (options: RegisterOverlayDismissOptions): (() => void) => {
  const handleKeyDown = ignoreRealInput((event: KeyboardEvent) => {
    if (!options.isOpen()) return;
    if (options.shouldIgnoreKeyboardEvent?.(event)) return;
    if (options.shouldIgnoreInputEvents && isKeyboardEventTriggeredByInput(event)) {
      return;
    }

    if (event.code === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      options.onDismiss("keyboard");
    }
  });

  const handleClickOutside = ignoreRealInput((event: MouseEvent | TouchEvent) => {
    if (!options.isOpen()) return;
    if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
    if (options.shouldIgnoreRightClick && event instanceof MouseEvent && event.button === 2) return;
    options.onDismiss("pointer");
  });

  // Click registration is deferred to the next frame so the same click or
  // touch that opened the overlay does not immediately trigger a dismiss.
  const frameId = nativeRequestAnimationFrame(() => {
    window.addEventListener("mousedown", handleClickOutside, {
      capture: true,
    });
    window.addEventListener("touchstart", handleClickOutside, {
      capture: true,
    });
  });

  window.addEventListener("keydown", handleKeyDown, { capture: true });

  return () => {
    nativeCancelAnimationFrame(frameId);
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
    window.removeEventListener("mousedown", handleClickOutside, {
      capture: true,
    });
    window.removeEventListener("touchstart", handleClickOutside, {
      capture: true,
    });
  };
};
