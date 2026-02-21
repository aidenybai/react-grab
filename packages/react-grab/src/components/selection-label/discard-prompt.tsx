import { onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { DiscardPromptProps } from "../../types.js";
import { confirmationFocusManager } from "../../utils/confirmation-focus-manager.js";
import { isKeyboardEventTriggeredByInput } from "../../utils/is-keyboard-event-triggered-by-input.js";
import { IconReturn } from "../icons/icon-return.jsx";
import { BottomSection } from "./bottom-section.js";

export const DiscardPrompt: Component<DiscardPromptProps> = (props) => {
  const instanceId = Symbol();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!confirmationFocusManager.isActive(instanceId)) return;
    if (isKeyboardEventTriggeredByInput(event)) return;

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
      class="contain-layout shrink-0 flex flex-col justify-center items-end w-fit h-fit"
      onPointerDown={handleFocus}
      onClick={handleFocus}
    >
      <div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 px-2 w-full h-fit">
        <span class="text-black text-[13px] leading-4 shrink-0 font-sans font-medium w-fit h-fit">
          {props.label ?? "Discard?"}
        </span>
      </div>
      <BottomSection>
        <div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit">
          <button
            data-react-grab-discard-no
            class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px]"
            onClick={props.onCancel}
          >
            <span class="text-black text-[13px] leading-3.5 font-sans font-medium">
              No
            </span>
          </button>
          <button
            data-react-grab-discard-yes
            class="contain-layout shrink-0 flex items-center justify-center gap-0.5 px-[3px] py-px rounded-sm bg-[#FEF2F2] cursor-pointer transition-all hover:bg-[#FEE2E2] press-scale h-[17px]"
            onClick={props.onConfirm}
          >
            <span class="text-[#B91C1C] text-[13px] leading-3.5 font-sans font-medium">
              Yes
            </span>
            <IconReturn size={10} class="text-[#B91C1C]/50" />
          </button>
        </div>
      </BottomSection>
    </div>
  );
};
