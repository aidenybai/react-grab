import { onMount, onCleanup, Show } from "solid-js";
import type { Component } from "solid-js";
import type { ErrorViewProps } from "../../types.js";
import { MODE, TEXT_PRIMARY, TEXT_SECONDARY } from "../../constants.js";
import { confirmationFocusManager } from "../../utils/confirmation-focus-manager.js";
import { isKeyboardEventTriggeredByInput } from "../../utils/is-keyboard-event-triggered-by-input.js";
import { cn } from "../../utils/cn.js";
import { IconRetry } from "../icons/icon-retry.jsx";
import { BottomSection } from "./bottom-section.js";

export const ErrorView: Component<ErrorViewProps> = (props) => {
  const instanceId = Symbol();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!confirmationFocusManager.isActive(instanceId)) return;
    if (isKeyboardEventTriggeredByInput(event)) return;

    const isEnter = event.code === "Enter";
    const isEscape = event.code === "Escape";

    if (isEnter) {
      event.preventDefault();
      event.stopPropagation();
      props.onRetry?.();
    } else if (isEscape) {
      event.preventDefault();
      event.stopPropagation();
      props.onAcknowledge?.();
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

  const hasActions = () => Boolean(props.onRetry || props.onAcknowledge);

  return (
    <div
      data-react-grab-error
      class="contain-layout shrink-0 flex flex-col justify-center items-end w-fit h-fit max-w-[280px]"
      onPointerDown={handleFocus}
      onClick={handleFocus}
    >
      <div
        class="contain-layout shrink-0 flex items-start gap-1 px-2 w-full h-fit"
        classList={{ "pt-1.5 pb-1": hasActions(), "py-1.5": !hasActions() }}
      >
        <span
          class="text-[#B91C1C] text-[13px] leading-4 font-sans font-medium overflow-hidden line-clamp-5"
          title={props.error}
        >
          {props.error}
        </span>
      </div>
      <Show when={hasActions()}>
        <BottomSection>
          <div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit">
            <button
              data-react-grab-retry
              class={cn(
                "contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm [border-width:0.5px] border-solid cursor-pointer transition-all press-scale h-[17px]",
                MODE === "dark"
                  ? "bg-white/10 border-white/20 hover:bg-white/15"
                  : "bg-white border-[#B3B3B3] hover:bg-[#F5F5F5]",
              )}
              onClick={props.onRetry}
            >
              <span
                class={cn(
                  "text-[13px] leading-3.5 font-sans font-medium",
                  TEXT_PRIMARY,
                )}
              >
                Retry
              </span>
              <IconRetry size={10} class={TEXT_SECONDARY} />
            </button>
            <button
              data-react-grab-error-ok
              class={cn(
                "contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm [border-width:0.5px] border-solid cursor-pointer transition-all press-scale h-[17px]",
                MODE === "dark"
                  ? "bg-white/10 border-white/20 hover:bg-white/15"
                  : "bg-white border-[#B3B3B3] hover:bg-[#F5F5F5]",
              )}
              onClick={props.onAcknowledge}
            >
              <span
                class={cn(
                  "text-[13px] leading-3.5 font-sans font-medium",
                  TEXT_PRIMARY,
                )}
              >
                Ok
              </span>
            </button>
          </div>
        </BottomSection>
      </Show>
    </div>
  );
};
