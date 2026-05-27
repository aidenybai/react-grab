import { onCleanup, onMount, type Component } from "solid-js";
import type { DiscardPromptProps } from "../../types.js";
import { confirmationFocusManager } from "../../utils/confirmation-focus-manager.js";
import { isKeyboardEventTriggeredByInput } from "../../utils/is-keyboard-event-triggered-by-input.js";

export const DiscardPrompt: Component<DiscardPromptProps> = (props) => {
  const instanceId = Symbol();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!confirmationFocusManager.isActive(instanceId)) return;
    if (isKeyboardEventTriggeredByInput(event)) return;

    // Escape confirms the discard by default ("yes, throw it away") rather
    // than canceling, which is intentionally opposite to most dialogs. The
    // cancelOnEscape prop flips this when the prompt itself should be
    // dismissible.
    const isEnter = event.code === "Enter";
    const isEscape = event.code === "Escape";
    if (isEnter || isEscape) {
      event.preventDefault();
      event.stopPropagation();
      if (isEscape && props.cancelOnEscape) {
        props.onCancel?.();
      } else {
        props.onConfirm?.();
      }
    }
  };

  const handleFocus = () => {
    confirmationFocusManager.claim(instanceId);
  };

  onMount(() => {
    confirmationFocusManager.claim(instanceId);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
  });

  onCleanup(() => {
    confirmationFocusManager.release(instanceId);
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
  });

  return (
    <div
      data-react-grab-discard-prompt
      role="alertdialog"
      aria-modal="true"
      aria-label={props.label ?? "Discard?"}
      class="contain-layout shrink-0 flex items-center justify-between gap-2 pt-1.5 pb-1 px-2 w-full self-stretch bg-[var(--rg-error-bg)] [box-shadow:var(--rg-danger-shadow)]"
      onPointerDown={handleFocus}
      onClick={handleFocus}
    >
      <span class="text-[var(--rg-text-primary)] text-[13px] leading-4 shrink-0 font-sans font-medium w-fit h-fit">
        {props.label ?? "Discard?"}
      </span>
      <div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-fit h-fit">
        <button
          data-react-grab-discard-no
          data-react-grab-discard-button="cancel"
          type="button"
          class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-[var(--rg-surface-hover)] [border-width:0.5px] border-solid border-[var(--rg-border-button)] cursor-pointer transition-all hover:bg-[var(--rg-surface-active)] press-scale h-[17px]"
          onClick={props.onCancel}
        >
          <span class="text-[var(--rg-text-primary)] text-[13px] leading-3.5 font-sans font-medium">
            No
          </span>
        </button>
        <button
          data-react-grab-discard-yes
          data-react-grab-discard-button="confirm"
          type="button"
          class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-black/15 cursor-pointer transition-all hover:bg-black/25 press-scale h-[17px]"
          onClick={props.onConfirm}
        >
          <span class="text-[var(--rg-error-text)] text-[13px] leading-3.5 font-sans font-medium">
            Yes
          </span>
        </button>
      </div>
    </div>
  );
};
