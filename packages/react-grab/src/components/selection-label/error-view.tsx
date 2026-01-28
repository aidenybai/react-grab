import { onMount, onCleanup, Show } from "solid-js";
import type { Component } from "solid-js";
import type { ErrorViewProps } from "../../types.js";
import { confirmationFocusManager } from "../../utils/confirmation-focus-manager.js";
import { isKeyboardEventTriggeredByInput } from "../../utils/is-keyboard-event-triggered-by-input.js";
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
              class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px]"
              onClick={props.onRetry}
            >
              <span class="text-black text-[13px] leading-3.5 font-sans font-medium">
                Retry
              </span>
              <IconRetry size={10} class="text-black/50" />
            </button>
            <button
              data-react-grab-error-ok
              class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px]"
              onClick={props.onAcknowledge}
            >
              <span class="text-black text-[13px] leading-3.5 font-sans font-medium">
                Ok
              </span>
            </button>
          </div>
        </BottomSection>
      </Show>
    </div>
  );
};
