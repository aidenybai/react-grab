import { onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { DiscardPromptProps } from "../../types.js";
import { MODE, TEXT_PRIMARY } from "../../constants.js";
import { confirmationFocusManager } from "../../utils/confirmation-focus-manager.js";
import { isKeyboardEventTriggeredByInput } from "../../utils/is-keyboard-event-triggered-by-input.js";
import { cn } from "../../utils/cn.js";
import { IconReturn } from "../icons/icon-return.jsx";
import { BottomSection } from "./bottom-section.js";

export const DiscardPrompt: Component<DiscardPromptProps> = (props) => {
  const instanceId = Symbol();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!confirmationFocusManager.isActive(instanceId)) return;
    if (isKeyboardEventTriggeredByInput(event)) return;

    const isConfirmKey = event.code === "Enter" || event.code === "Escape";
    if (isConfirmKey) {
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
      class="contain-layout shrink-0 flex flex-col justify-center items-end w-fit h-fit"
      onPointerDown={handleFocus}
      onClick={handleFocus}
    >
      <div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 px-2 w-full h-fit">
        <span
          class={cn(
            "text-[13px] leading-4 shrink-0 font-sans font-medium w-fit h-fit",
            TEXT_PRIMARY,
          )}
        >
          Discard?
        </span>
      </div>
      <BottomSection>
        <div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit">
          <button
            data-react-grab-discard-no
            class={cn(
              "contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm [border-width:0.5px] border-solid cursor-pointer transition-all press-scale h-[17px]",
              MODE === "dark"
                ? "bg-white/10 border-white/20 hover:bg-white/15"
                : "bg-white border-[#B3B3B3] hover:bg-[#F5F5F5]",
            )}
            onClick={props.onCancel}
          >
            <span
              class={cn(
                "text-[13px] leading-3.5 font-sans font-medium",
                TEXT_PRIMARY,
              )}
            >
              No
            </span>
          </button>
          <button
            data-react-grab-discard-yes
            class={cn(
              "contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm cursor-pointer transition-all press-scale h-[17px]",
              MODE === "dark"
                ? "bg-red-900/40 hover:bg-red-900/50"
                : "bg-[#FEF2F2] hover:bg-[#FEE2E2]",
            )}
            onClick={props.onConfirm}
          >
            <span class="text-[#ef4444] text-[13px] leading-3.5 font-sans font-medium">
              Yes
            </span>
            <IconReturn size={10} class="text-[#ef4444]" />
          </button>
        </div>
      </BottomSection>
    </div>
  );
};
