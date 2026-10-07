import { onCleanup, onMount } from "solid-js";
import { confirmationFocusManager } from "./confirmation-focus-manager.js";
import { isKeyboardEventTriggeredByInput } from "./is-keyboard-event-triggered-by-input.js";
import { ignoreRealInput } from "./runtime-mode.js";

interface ConfirmationKeyboardHandlers {
  onEnter?: (event: KeyboardEvent) => void;
  onEscape?: (event: KeyboardEvent) => void;
}

interface ConfirmationKeyboardController {
  claimFocus: () => void;
}

// Shared wiring for the confirmation prompts (completion/discard/error): claim
// a slot in the focus manager, listen for Enter/Escape at the window in capture
// phase so it wins against focus traps, and ignore keystrokes that belong to a
// focused input. Each prompt supplies only its Enter/Escape bodies.
export const createConfirmationKeyboard = (
  handlers: ConfirmationKeyboardHandlers,
): ConfirmationKeyboardController => {
  const instanceId = Symbol();

  const handleKeyDown = ignoreRealInput((event: KeyboardEvent): void => {
    if (!confirmationFocusManager.isActive(instanceId)) return;
    if (isKeyboardEventTriggeredByInput(event)) return;
    if (event.code === "Enter") {
      handlers.onEnter?.(event);
    } else if (event.code === "Escape") {
      handlers.onEscape?.(event);
    }
  });

  onMount(() => {
    confirmationFocusManager.claim(instanceId);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
  });

  onCleanup(() => {
    confirmationFocusManager.release(instanceId);
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
  });

  return {
    claimFocus: () => confirmationFocusManager.claim(instanceId),
  };
};
