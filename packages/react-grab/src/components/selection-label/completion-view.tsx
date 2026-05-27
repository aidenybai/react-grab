import { createSignal, onCleanup, onMount, Show, type Component } from "solid-js";
import type { CompletionViewProps } from "../../types.js";
import { FEEDBACK_DURATION_MS, FADE_DURATION_MS } from "../../constants.js";
import { confirmationFocusManager } from "../../utils/confirmation-focus-manager.js";
import { isKeyboardEventTriggeredByInput } from "../../utils/is-keyboard-event-triggered-by-input.js";
import { IconReturn } from "../icons/icon-return.jsx";
import { IconEllipsis } from "../icons/icon-ellipsis.jsx";
import { cn } from "../../utils/cn.js";
import { IconCheck } from "../icons/icon-check.jsx";

interface MoreOptionsButtonProps {
  onClick: () => void;
}

const MoreOptionsButton: Component<MoreOptionsButtonProps> = (props) => {
  return (
    <button
      data-react-grab-ignore-events
      data-react-grab-more-options
      class="group flex items-center justify-center size-4 rounded-sm cursor-pointer bg-transparent hover:bg-[var(--rg-surface-hover)] text-[var(--rg-text-secondary)] hover:text-[var(--rg-text-primary)] border-none outline-none p-0 shrink-0 press-scale"
      // The on: prefix attaches a native event listener (rather than using
      // SolidJS delegation) so stopImmediatePropagation can beat both
      // delegated handlers and document-level capture listeners.
      on:pointerdown={(event) => {
        event.stopImmediatePropagation();
      }}
      on:click={(event) => {
        event.stopImmediatePropagation();
        props.onClick();
      }}
    >
      <IconEllipsis size={14} class="opacity-50 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

export const CompletionView: Component<CompletionViewProps> = (props) => {
  const instanceId = Symbol();
  let fadeTimeoutId: number | undefined;
  let dismissTimeoutId: number | undefined;
  const [didCopy, setDidCopy] = createSignal(false);
  const [isFading, setIsFading] = createSignal(false);
  const displayStatusText = () => (didCopy() ? "Copied" : props.statusText);

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
    fadeTimeoutId = window.setTimeout(() => {
      setIsFading(true);
      props.onFadingChange?.(true);
      dismissTimeoutId = window.setTimeout(() => {
        props.onDismiss?.();
      }, FADE_DURATION_MS);
    }, FEEDBACK_DURATION_MS - FADE_DURATION_MS);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!confirmationFocusManager.isActive(instanceId)) return;

    const isEnter = event.code === "Enter";
    const isEscape = event.code === "Escape";

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

  onMount(() => {
    confirmationFocusManager.claim(instanceId);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
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
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class={cn(
        "contain-layout shrink-0 flex flex-col justify-center items-end rounded-full antialiased w-fit h-fit max-w-[280px] transition-opacity duration-100 ease-out [font-synthesis:none]",
        "bg-[var(--rg-panel-bg)] [box-shadow:var(--rg-shadow)] backdrop-blur-[48px]",
      )}
      style={{ opacity: isFading() ? 0 : 1 }}
      onPointerDown={handleFocus}
      onClick={handleFocus}
    >
      <Show when={!didCopy() && props.onDismiss}>
        <div class="contain-layout shrink-0 flex items-center justify-between gap-2 pt-1.5 pb-1 px-2 w-full h-fit">
          <span class="text-[var(--rg-text-primary)] text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
            {displayStatusText()}
          </span>
          <div class="contain-layout shrink-0 flex items-center gap-2 h-fit">
            <Show when={props.onShowContextMenu}>
              <MoreOptionsButton onClick={handleShowContextMenu} />
            </Show>
            <Show when={props.onDismiss}>
              <button
                data-react-grab-dismiss
                type="button"
                aria-keyshortcuts="Enter"
                class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-[var(--rg-surface-hover)] [border-width:0.5px] border-solid border-[var(--rg-border-button)] cursor-pointer transition-all hover:bg-[var(--rg-surface-active)] press-scale h-[17px]"
                onClick={handleAccept}
                disabled={didCopy()}
                aria-disabled={didCopy()}
              >
                <span class="text-[var(--rg-text-primary)] text-[13px] leading-3.5 font-sans font-medium">
                  Keep
                </span>
                <Show when={!didCopy()}>
                  <IconReturn size={10} class="text-[var(--rg-text-secondary)]" />
                </Show>
              </button>
            </Show>
          </div>
        </div>
      </Show>
      <Show when={didCopy() || !props.onDismiss}>
        <div class="contain-layout shrink-0 flex items-center gap-0.5 py-1.5 px-2 w-full h-fit">
          <IconCheck
            size={14}
            aria-hidden="true"
            class="text-[var(--rg-text-primary-85)] shrink-0"
          />
          <span class="text-[var(--rg-text-primary)] text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
            {displayStatusText()}
          </span>
          <Show when={props.onShowContextMenu}>
            <MoreOptionsButton onClick={handleShowContextMenu} />
          </Show>
        </div>
      </Show>
    </div>
  );
};
