import { createSignal, onCleanup, Show, type Component } from "solid-js";
import type { CompletionViewProps } from "../../types.js";
import { FEEDBACK_DURATION_MS, FADE_DURATION_MS } from "../../constants.js";
import { createConfirmationKeyboard } from "../../utils/create-confirmation-keyboard.js";
import { IconReturn } from "../icons/icon-return.jsx";
import { IconEllipsis } from "../icons/icon-ellipsis.jsx";
import { cn } from "../../utils/cn.js";
import { Button, buttonVariants } from "../ui/button.js";
import { Surface } from "../ui/surface.js";
import { IconCheck } from "../icons/icon-check.jsx";

interface MoreOptionsButtonProps {
  onClick: () => void;
}

const MoreOptionsButton: Component<MoreOptionsButtonProps> = (props) => {
  return (
    <button
      data-react-grab-ignore-events
      data-react-grab-more-options
      class={cn(
        buttonVariants({ variant: "ghost" }),
        "group size-4 text-[var(--rg-text-secondary)] hover:text-[var(--rg-text-primary)]",
      )}
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

  const { claimFocus } = createConfirmationKeyboard({
    onEnter: (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleAccept();
    },
    onEscape: (event) => {
      event.preventDefault();
      event.stopPropagation();
      props.onDismiss?.();
    },
  });

  onCleanup(() => {
    if (fadeTimeoutId !== undefined) window.clearTimeout(fadeTimeoutId);
    if (dismissTimeoutId !== undefined) window.clearTimeout(dismissTimeoutId);
  });

  return (
    <Surface
      shape="pill"
      data-react-grab-completion
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="shrink-0 flex flex-col justify-center items-end w-fit h-fit max-w-[280px] transition-opacity duration-100 ease-out"
      style={{ opacity: isFading() ? 0 : 1 }}
      onPointerDown={claimFocus}
      onClick={claimFocus}
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
              <Button
                data-react-grab-dismiss
                class="gap-1"
                aria-keyshortcuts="Enter"
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
              </Button>
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
    </Surface>
  );
};
