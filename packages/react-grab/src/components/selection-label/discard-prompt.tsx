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
    if (event.code === "Enter" || event.code === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      props.onConfirm?.();
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
      class="contain-layout shrink-0 flex flex-col justify-center items-end gap-1 w-fit h-fit"
      onPointerDown={handleFocus}
      onClick={handleFocus}
    >
      <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 px-1.5 w-full h-fit">
        <span class="text-[#ededed] text-[13px] leading-4 shrink-0 font-sans font-medium w-fit h-fit">
          Discard?
        </span>
      </div>
      <BottomSection>
        <div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit">
          <button
            data-react-grab-discard-no
            class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-[#0a0a0a] [border-width:0.5px] border-solid border-[#343434] cursor-pointer transition-all hover:bg-[#1e1e1e] h-[17px]"
            onClick={props.onCancel}
          >
            <span class="text-[#ededed] text-[13px] leading-3.5 font-sans font-medium">
              No
            </span>
          </button>
          <button
            data-react-grab-discard-yes
            class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-[#0a0a0a] [border-width:0.5px] border-solid border-[#e5484d] cursor-pointer transition-all hover:bg-[#2a1313] h-[17px]"
            onClick={props.onConfirm}
          >
            <span class="text-[#ff6469] text-[13px] leading-3.5 font-sans font-medium">
              Yes
            </span>
            <IconReturn size={10} class="text-[#ca2a31]" />
          </button>
        </div>
      </BottomSection>
    </div>
  );
};
