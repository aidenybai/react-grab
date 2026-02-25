import { Show, createSignal, createEffect, onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { CompletionViewProps } from "../../types.js";
import {
  FEEDBACK_DURATION_MS,
  FADE_DURATION_MS,
  PANEL_STYLES,
} from "../../constants.js";
import { confirmationFocusManager } from "../../utils/confirmation-focus-manager.js";
import { isKeyboardEventTriggeredByInput } from "../../utils/is-keyboard-event-triggered-by-input.js";
import { IconReply } from "../icons/icon-reply.jsx";
import { IconReturn } from "../icons/icon-return.jsx";
import { IconSubmit } from "../icons/icon-submit.jsx";
import { IconEllipsis } from "../icons/icon-ellipsis.jsx";
import { cn } from "../../utils/cn.js";
import { IconCheck } from "../icons/icon-check.jsx";
import { BottomSection } from "./bottom-section.js";

interface MoreOptionsButtonProps {
  onClick: () => void;
}

const MoreOptionsButton: Component<MoreOptionsButtonProps> = (props) => {
  return (
    <button
      data-react-grab-ignore-events
      data-react-grab-more-options
      class="flex items-center justify-center size-[18px] rounded-sm cursor-pointer bg-transparent hover:bg-black/10 text-black/30 hover:text-black border-none outline-none p-0 shrink-0 press-scale"
      // HACK: Native events with stopImmediatePropagation needed to block document-level handlers in the overlay system
      on:pointerdown={(event) => {
        event.stopImmediatePropagation();
      }}
      on:click={(event) => {
        event.stopImmediatePropagation();
        props.onClick();
      }}
    >
      <IconEllipsis size={14} />
    </button>
  );
};

export const CompletionView: Component<CompletionViewProps> = (props) => {
  const instanceId = Symbol();
  let inputRef: HTMLTextAreaElement | undefined;
  let fadeTimeoutId: number | undefined;
  let dismissTimeoutId: number | undefined;
  const [didCopy, setDidCopy] = createSignal(false);
  const [isFading, setIsFading] = createSignal(false);
  const [displayStatusText, setDisplayStatusText] = createSignal(
    props.statusText,
  );
  const [followUpInput, setFollowUpInput] = createSignal("");

  const handleShowContextMenu = () => {
    if (fadeTimeoutId !== undefined) window.clearTimeout(fadeTimeoutId);
    if (dismissTimeoutId !== undefined) window.clearTimeout(dismissTimeoutId);
    setIsFading(true);
    props.onFadingChange?.(true);
    props.onShowContextMenu?.();
  };

  const handleAccept = () => {
    if (didCopy()) return;
    setDidCopy(true);
    setDisplayStatusText("Copied");
    props.onCopyStateChange?.();
    fadeTimeoutId = window.setTimeout(() => {
      setIsFading(true);
      props.onFadingChange?.(true);
      dismissTimeoutId = window.setTimeout(() => {
        props.onDismiss?.();
      }, FADE_DURATION_MS);
    }, FEEDBACK_DURATION_MS - FADE_DURATION_MS);
  };

  const handleFollowUpSubmit = () => {
    const prompt = followUpInput().trim();
    if (prompt && props.onFollowUpSubmit) {
      props.onFollowUpSubmit(prompt);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.keyCode === 229) {
      return;
    }

    const isUndoRedo =
      event.code === "KeyZ" && (event.metaKey || event.ctrlKey);
    const isEnterWithoutShift = event.code === "Enter" && !event.shiftKey;
    const isEscape = event.code === "Escape";

    if (!isUndoRedo) {
      event.stopImmediatePropagation();
    }

    if (isEnterWithoutShift) {
      event.preventDefault();
      const prompt = followUpInput().trim();
      if (prompt) {
        handleFollowUpSubmit();
      } else {
        handleAccept();
      }
    } else if (isEscape) {
      event.preventDefault();
      props.onDismiss?.();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!confirmationFocusManager.isActive(instanceId)) return;

    const isUndo =
      event.code === "KeyZ" &&
      (event.metaKey || event.ctrlKey) &&
      !event.shiftKey;
    const isEnter = event.code === "Enter";
    const isEscape = event.code === "Escape";

    if (isUndo && props.supportsUndo && props.onUndo) {
      event.preventDefault();
      event.stopPropagation();
      props.onUndo();
      return;
    }

    if (isKeyboardEventTriggeredByInput(event)) return;

    if (isEnter) {
      event.preventDefault();
      event.stopPropagation();
      handleAccept();
    } else if (isEscape) {
      event.preventDefault();
      event.stopPropagation();
      props.onDismiss?.();
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
    if (fadeTimeoutId !== undefined) window.clearTimeout(fadeTimeoutId);
    if (dismissTimeoutId !== undefined) window.clearTimeout(dismissTimeoutId);
  });

  return (
    <div
      data-react-grab-completion
      class={cn(
        "contain-layout shrink-0 flex flex-col justify-center items-end rounded-[10px] antialiased w-fit h-fit max-w-[280px] transition-opacity duration-100 ease-out [font-synthesis:none] [corner-shape:superellipse(1.25)]",
        PANEL_STYLES,
      )}
      style={{ opacity: isFading() ? 0 : 1 }}
      onPointerDown={handleFocus}
      onClick={handleFocus}
    >
      <Show when={!didCopy() && (props.onDismiss || props.onUndo)}>
        <div class="contain-layout shrink-0 flex items-center justify-between gap-2 pt-1.5 pb-1 px-2 w-full h-fit">
          <span class="text-black text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
            {displayStatusText()}
          </span>
          <div class="contain-layout shrink-0 flex items-center gap-2 h-fit">
            <Show when={props.onShowContextMenu && !props.supportsFollowUp}>
              <MoreOptionsButton onClick={handleShowContextMenu} />
            </Show>
            <Show when={props.supportsUndo && props.onUndo}>
              <button
                data-react-grab-undo
                class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-[#FEF2F2] cursor-pointer transition-all hover:bg-[#FEE2E2] press-scale h-[17px]"
                onClick={() => props.onUndo?.()}
              >
                <span class="text-[#B91C1C] text-[13px] leading-3.5 font-sans font-medium">
                  Undo
                </span>
              </button>
            </Show>
            <Show when={props.onDismiss}>
              <button
                data-react-grab-dismiss
                class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px]"
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
        <div class="contain-layout shrink-0 flex items-center gap-0.5 py-1.5 px-2 w-full h-fit">
          <IconCheck
            size={14}
            class="text-black/85 shrink-0 animate-success-pop"
          />
          <span class="text-black text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
            {displayStatusText()}
          </span>
          <Show when={props.onShowContextMenu && !props.supportsFollowUp}>
            <MoreOptionsButton onClick={handleShowContextMenu} />
          </Show>
        </div>
      </Show>
      <Show
        when={!didCopy() && props.supportsFollowUp && props.onFollowUpSubmit}
      >
        <BottomSection>
          <Show when={props.previousPrompt}>
            <div class="flex items-center gap-1 w-full mb-1 overflow-hidden">
              <IconReply size={10} class="text-black/30 shrink-0" />
              <span class="text-black/40 text-[11px] leading-3 font-medium truncate italic">
                {props.previousPrompt}
              </span>
            </div>
          </Show>
          <div
            class="shrink-0 flex justify-between items-end w-full min-h-4"
            style={{ "padding-left": props.previousPrompt ? "14px" : "0" }}
          >
            <textarea
              ref={inputRef}
              data-react-grab-ignore-events
              data-react-grab-followup-input
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
              placeholder="follow-up"
              rows={1}
            />
            <button
              data-react-grab-followup-submit
              class={cn(
                "contain-layout shrink-0 flex items-center justify-center size-4 rounded-full bg-black cursor-pointer ml-1 interactive-scale",
                !followUpInput().trim() && "opacity-35",
              )}
              onClick={handleFollowUpSubmit}
            >
              <IconSubmit size={10} class="text-white" />
            </button>
          </div>
        </BottomSection>
      </Show>
    </div>
  );
};
