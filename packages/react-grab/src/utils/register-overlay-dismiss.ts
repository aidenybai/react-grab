import { createEventListener } from "./create-event-listener.js";
import { isEventFromOverlay } from "./is-event-from-overlay.js";
import { isKeyboardEventTriggeredByInput } from "./is-keyboard-event-triggered-by-input.js";
import { nativeCancelAnimationFrame, nativeRequestAnimationFrame } from "./native-raf.js";

interface RegisterOverlayDismissOptions {
  isOpen: () => boolean;
  onDismiss: () => void;
  onConfirm?: () => void;
  shouldIgnoreInputEvents?: boolean;
  shouldIgnoreRightClick?: boolean;
}

const CAPTURE_OPTIONS: AddEventListenerOptions = { capture: true };

export const registerOverlayDismiss = (options: RegisterOverlayDismissOptions): (() => void) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!options.isOpen()) return;
    if (options.shouldIgnoreInputEvents && isKeyboardEventTriggeredByInput(event)) {
      return;
    }

    const isEscape = event.code === "Escape";

    if (isEscape) {
      event.preventDefault();
      event.stopImmediatePropagation();
      options.onDismiss();
      return;
    }

    if (event.code === "Enter" && options.onConfirm) {
      event.preventDefault();
      event.stopImmediatePropagation();
      options.onConfirm();
    }
  };

  const handleClickOutside = (event: MouseEvent | TouchEvent) => {
    if (!options.isOpen()) return;
    if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;
    if (options.shouldIgnoreRightClick && event instanceof MouseEvent && event.button === 2) return;
    options.onDismiss();
  };

  const dismissListener = createEventListener<WindowEventMap>({
    keydown: handleKeyDown,
    mousedown: handleClickOutside,
    touchstart: handleClickOutside,
  });

  // Click registration is deferred to the next frame so the same click or
  // touch that opened the overlay does not immediately trigger a dismiss.
  const frameId = nativeRequestAnimationFrame(() => {
    window.addEventListener("mousedown", dismissListener, CAPTURE_OPTIONS);
    window.addEventListener("touchstart", dismissListener, CAPTURE_OPTIONS);
  });

  window.addEventListener("keydown", dismissListener, CAPTURE_OPTIONS);

  return () => {
    nativeCancelAnimationFrame(frameId);
    window.removeEventListener("keydown", dismissListener, CAPTURE_OPTIONS);
    window.removeEventListener("mousedown", dismissListener, CAPTURE_OPTIONS);
    window.removeEventListener("touchstart", dismissListener, CAPTURE_OPTIONS);
  };
};
