import { Show, createSignal, createEffect, onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { CompletionViewProps } from "../../types.js";
import { COPIED_LABEL_DURATION_MS } from "../../constants.js";
import { confirmationFocusManager } from "../../utils/confirmation-focus-manager.js";
import { isKeyboardEventTriggeredByInput } from "../../utils/is-keyboard-event-triggered-by-input.js";
import { IconReturn } from "../icons/icon-return.jsx";
import { BottomSection } from "./bottom-section.js";

export const CompletionView: Component<CompletionViewProps> = (props) => {
  const instanceId = Symbol();
  let inputRef: HTMLTextAreaElement | undefined;
  const [didCopy, setDidCopy] = createSignal(false);
  const [displayStatusText, setDisplayStatusText] = createSignal(
    props.statusText,
  );
  const [followUpInput, setFollowUpInput] = createSignal("");

  const handleAccept = () => {
    setDidCopy(true);
    setDisplayStatusText("Copied");
    props.onCopyStateChange?.();
    setTimeout(() => {
      props.onDismiss?.();
    }, COPIED_LABEL_DURATION_MS);
  };

  const handleFollowUpSubmit = () => {
    const prompt = followUpInput().trim();
    if (prompt && props.onFollowUpSubmit) {
      props.onFollowUpSubmit(prompt);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent) => {
    const isUndoRedo =
      event.code === "KeyZ" && (event.metaKey || event.ctrlKey);

    if (!isUndoRedo) {
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    if (event.code === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const prompt = followUpInput().trim();
      if (prompt) {
        handleFollowUpSubmit();
      } else {
        handleAccept();
      }
    } else if (event.code === "Escape") {
      event.preventDefault();
      handleAccept();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!confirmationFocusManager.isActive(instanceId)) return;

    const isUndo =
      event.code === "KeyZ" &&
      (event.metaKey || event.ctrlKey) &&
      !event.shiftKey;

    if (isUndo && props.supportsUndo && props.onUndo) {
      event.preventDefault();
      event.stopPropagation();
      props.onUndo();
      return;
    }

    if (isKeyboardEventTriggeredByInput(event)) return;

    if (event.code === "Enter" || event.code === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      handleAccept();
    }
  };

  const handleFocus = () => {
    confirmationFocusManager.claim(instanceId);
  };

  createEffect(() => {
    if (!didCopy()) {
      setDisplayStatusText(props.statusText);
    }
  });

  onMount(() => {
    confirmationFocusManager.claim(instanceId);
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    if (props.supportsFollowUp && props.onFollowUpSubmit && inputRef) {
      inputRef.focus();
    }
  });

  onCleanup(() => {
    confirmationFocusManager.release(instanceId);
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
  });

  return (
    <div
      class="[font-synthesis:none] contain-layout shrink-0 flex flex-col justify-center items-end rounded-sm bg-white antialiased w-fit h-fit max-w-[280px]"
      onPointerDown={handleFocus}
      onClick={handleFocus}
    >
      <Show when={!didCopy() && (props.onDismiss || props.onUndo)}>
        <div class="contain-layout shrink-0 flex items-center justify-between gap-2 pt-1.5 pb-1 px-1.5 w-full h-fit">
          <span class="text-black text-[13px] leading-4 shrink-0 font-sans font-medium w-fit h-fit tabular-nums">
            {displayStatusText()}
          </span>
          <div class="contain-layout shrink-0 flex items-center gap-[5px] h-fit">
            <Show when={props.supportsUndo && props.onUndo}>
              <button
                class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#7e0002] cursor-pointer transition-all hover:bg-[#FEF2F2] h-[17px]"
                onClick={() => props.onUndo?.()}
              >
                <span class="text-[#B91C1C] text-[13px] leading-3.5 font-sans font-medium">
                  Undo
                </span>
              </button>
            </Show>
            <Show when={props.onDismiss}>
              <button
                class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] h-[17px]"
                onClick={handleAccept}
                disabled={didCopy()}
              >
                <span class="text-black text-[13px] leading-3.5 font-sans font-medium">
                  {props.dismissButtonText ?? "Keep"}
                </span>
                <Show when={!didCopy()}>
                  <IconReturn size={10} class="text-black/50" />
                </Show>
              </button>
            </Show>
          </div>
        </div>
      </Show>
      <Show when={didCopy() || (!props.onDismiss && !props.onUndo)}>
        <div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 px-1.5 w-full h-fit">
          <span class="text-black text-[13px] leading-4 shrink-0 font-sans font-medium w-fit h-fit tabular-nums">
            {displayStatusText()}
          </span>
        </div>
      </Show>
      <Show
        when={!didCopy() && props.supportsFollowUp && props.onFollowUpSubmit}
      >
        <BottomSection>
          <div class="shrink-0 flex justify-between items-end w-full min-h-4">
            <textarea
              ref={inputRef}
              data-react-grab-ignore-events
              class="text-black text-[13px] leading-4 font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 wrap-break-word overflow-y-auto"
              style={{
                "field-sizing": "content",
                "min-height": "16px",
                "max-height": "95px",
                "scrollbar-width": "none",
              }}
              value={followUpInput()}
              onInput={(event) => setFollowUpInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={props.previousPrompt ?? "type follow-up"}
              rows={1}
            />
            <button
              class="contain-layout shrink-0 flex flex-col items-start px-[3px] py-[3px] rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] size-fit cursor-pointer transition-all hover:scale-105 ml-1"
              onClick={handleFollowUpSubmit}
            >
              <IconReturn size={10} class="opacity-[0.99] text-black" />
            </button>
          </div>
        </BottomSection>
      </Show>
    </div>
  );
};
