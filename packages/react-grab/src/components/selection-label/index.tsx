import { Show, createSignal, createEffect, onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { ArrowPosition, SelectionLabelProps } from "../../types.js";
import {
  VIEWPORT_MARGIN_PX,
  ARROW_HEIGHT_PX,
  ARROW_CENTER_PERCENT,
  LABEL_GAP_PX,
  IDLE_TIMEOUT_MS,
} from "../../constants.js";
import { isKeyboardEventTriggeredByInput } from "../../utils/is-keyboard-event-triggered-by-input.js";
import { cn } from "../../utils/cn.js";
import { getTagDisplay } from "../../utils/get-tag-display.js";
import { IconSubmit } from "../icons/icon-submit.jsx";
import { IconStop } from "../icons/icon-stop.jsx";
import { Arrow } from "./arrow.js";
import { TagBadge } from "./tag-badge.js";
import { ActionPill } from "./action-pill.js";
import { BottomSection } from "./bottom-section.js";
import { DiscardPrompt } from "./discard-prompt.js";
import { ErrorView } from "./error-view.js";
import { CompletionView } from "./completion-view.js";

const DEFAULT_OFFSCREEN_POSITION = {
  left: -9999,
  top: -9999,
  arrowLeftPercent: ARROW_CENTER_PERCENT,
  arrowLeftOffset: 0,
  edgeOffsetX: 0,
};

export const SelectionLabel: Component<SelectionLabelProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let inputRef: HTMLTextAreaElement | undefined;
  let isTagCurrentlyHovered = false;
  let lastValidPosition: {
    left: number;
    top: number;
    arrowLeftPercent: number;
    arrowLeftOffset: number;
    edgeOffsetX: number;
  } | null = null;
  let lastElementIdentity: string | null = null;

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [arrowPosition, setArrowPosition] =
    createSignal<ArrowPosition>("bottom");
  const [viewportVersion, setViewportVersion] = createSignal(0);
  const [isIdle, setIsIdle] = createSignal(false);
  const [hadValidBounds, setHadValidBounds] = createSignal(false);
  const [isInternalFading, setIsInternalFading] = createSignal(false);

  const canInteract = () =>
    props.status !== "copying" &&
    props.status !== "copied" &&
    props.status !== "fading" &&
    props.status !== "error";

  const isCompletedStatus = () =>
    props.status === "copied" || props.status === "fading";

  const shouldEnablePointerEvents = (): boolean =>
    props.isPromptMode ||
    (isCompletedStatus() &&
      Boolean(props.onDismiss || props.onShowContextMenu)) ||
    (props.status === "copying" && Boolean(props.onAbort)) ||
    (props.status === "error" &&
      Boolean(props.onAcknowledgeError || props.onRetry));

  const showOpenIndicator = () => props.isContextMenuOpen === true;

  const measureContainer = () => {
    if (containerRef && !isTagCurrentlyHovered) {
      const rect = containerRef.getBoundingClientRect();
      setMeasuredWidth(rect.width);
      setMeasuredHeight(rect.height);
    }
  };

  const handleTagHoverChange = (hovered: boolean) => {
    isTagCurrentlyHovered = hovered;
  };

  const handleViewportChange = () => {
    setViewportVersion((version) => version + 1);
  };

  let idleTimeout: ReturnType<typeof setTimeout> | undefined;

  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimeout) {
      clearTimeout(idleTimeout);
    }
    idleTimeout = setTimeout(() => {
      setIsIdle(true);
    }, IDLE_TIMEOUT_MS);
  };

  const handleGlobalKeyDown = (event: KeyboardEvent) => {
    if (isKeyboardEventTriggeredByInput(event)) return;

    const isEnterToExpand =
      event.code === "Enter" && !props.isPromptMode && canInteract();
    const isCtrlCToAbort =
      event.code === "KeyC" &&
      event.ctrlKey &&
      props.status === "copying" &&
      props.onAbort;

    if (isEnterToExpand) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      props.onToggleExpand?.();
    } else if (isCtrlCToAbort) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      props.onAbort?.();
    }
  };

  onMount(() => {
    measureContainer();
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true });
    resetIdleTimer();
  });

  onCleanup(() => {
    window.removeEventListener("scroll", handleViewportChange, true);
    window.removeEventListener("resize", handleViewportChange);
    window.removeEventListener("keydown", handleGlobalKeyDown, {
      capture: true,
    });
    if (idleTimeout) {
      clearTimeout(idleTimeout);
    }
  });

  createEffect(() => {
    const elementIdentity = `${props.tagName ?? ""}:${props.componentName ?? ""}`;
    if (elementIdentity !== lastElementIdentity) {
      lastElementIdentity = elementIdentity;
      lastValidPosition = null;
      resetIdleTimer();
    }
  });

  createEffect(() => {
    // HACK: trigger measurement when content that affects size changes
    // this is necessary because Solid's fine-grained reactivity means we don't re-render
    // the entire component when props change. Since the label position depends on its
    // width/height (to center it), and width/height depends on content, we must force
    // a re-measure whenever ANY prop that could change the rendered size updates.
    // Without this, switching from a short tag to a long component name would use the
    // old cached width, causing the label to be offset incorrectly.
    void props.tagName;
    void props.componentName;
    void props.elementsCount;
    void props.statusText;
    void props.inputValue;
    void props.hasAgent;
    void props.isPromptMode;
    void props.isPendingDismiss;
    void props.error;
    void props.isPendingAbort;
    void props.visible;
    void props.status;
    void isIdle();
    // HACK: use queueMicrotask instead of RAF to measure sooner after content changes
    // This prevents the flicker when transitioning between states (e.g., clicking "Keep")
    queueMicrotask(measureContainer);
  });

  createEffect(() => {
    if (props.isPromptMode && inputRef) {
      setTimeout(() => {
        inputRef?.focus();
      }, 0);
    }
  });

  const computedPosition = () => {
    viewportVersion();

    const bounds = props.selectionBounds;
    const labelWidth = measuredWidth();
    const labelHeight = measuredHeight();
    const hasMeasurements = labelWidth > 0 && labelHeight > 0;
    const hasValidBounds = bounds && bounds.width > 0 && bounds.height > 0;

    if (!hasMeasurements || !hasValidBounds) {
      return lastValidPosition ?? DEFAULT_OFFSCREEN_POSITION;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const isSelectionVisibleInViewport =
      bounds.x + bounds.width > 0 &&
      bounds.x < viewportWidth &&
      bounds.y + bounds.height > 0 &&
      bounds.y < viewportHeight;

    if (!isSelectionVisibleInViewport) {
      return DEFAULT_OFFSCREEN_POSITION;
    }

    const selectionCenterX = bounds.x + bounds.width / 2;
    const cursorX = props.mouseX ?? selectionCenterX;
    const selectionBottom = bounds.y + bounds.height;
    const selectionTop = bounds.y;

    // HACK: Use cursorX as anchor point, CSS transform handles centering via translateX(-50%)
    // This avoids the flicker when content changes because centering doesn't depend on JS measurement
    const anchorX = cursorX;
    let edgeOffsetX = 0;
    let positionTop = selectionBottom + ARROW_HEIGHT_PX + LABEL_GAP_PX;

    // Calculate edge clamping offset (only applied when we have valid measurements)
    if (labelWidth > 0) {
      const labelLeft = anchorX - labelWidth / 2;
      const labelRight = anchorX + labelWidth / 2;

      if (labelRight > viewportWidth - VIEWPORT_MARGIN_PX) {
        edgeOffsetX = viewportWidth - VIEWPORT_MARGIN_PX - labelRight;
      }
      if (labelLeft + edgeOffsetX < VIEWPORT_MARGIN_PX) {
        edgeOffsetX = VIEWPORT_MARGIN_PX - labelLeft;
      }
    }

    const totalHeightNeeded = labelHeight + ARROW_HEIGHT_PX + LABEL_GAP_PX;
    const fitsBelow =
      positionTop + labelHeight <= viewportHeight - VIEWPORT_MARGIN_PX;

    if (!fitsBelow) {
      positionTop = selectionTop - totalHeightNeeded;
      setArrowPosition("top");
    } else {
      setArrowPosition("bottom");
    }

    if (positionTop < VIEWPORT_MARGIN_PX) {
      positionTop = VIEWPORT_MARGIN_PX;
    }

    // Arrow is centered by default, offset by edge clamping
    // When edgeOffsetX is 0, arrow is at center. When label shifts, arrow compensates.
    const arrowLeftPercent = ARROW_CENTER_PERCENT;
    const arrowLeftOffset = -edgeOffsetX; // px offset to keep arrow pointing at cursor

    const position = { left: anchorX, top: positionTop, arrowLeftPercent, arrowLeftOffset, edgeOffsetX };
    lastValidPosition = position;
    setHadValidBounds(true);

    return position;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    event.stopImmediatePropagation();

    const isEnterWithoutShift = event.code === "Enter" && !event.shiftKey;
    const isEscape = event.code === "Escape";

    if (isEnterWithoutShift) {
      event.preventDefault();
      props.onSubmit?.();
    } else if (isEscape) {
      event.preventDefault();
      props.onConfirmDismiss?.();
    }
  };

  const handleInput = (event: InputEvent) => {
    const target = event.target as HTMLTextAreaElement;
    props.onInputChange?.(target.value);
  };

  const tagDisplayResult = () =>
    getTagDisplay({
      tagName: props.tagName,
      componentName: props.componentName,
      elementsCount: props.elementsCount,
    });

  const tagDisplay = () => tagDisplayResult().tagName;
  const componentNameDisplay = () => tagDisplayResult().componentName;

  const handleTagClick = (event: MouseEvent) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (props.filePath && props.onOpen) {
      props.onOpen();
    }
  };

  const isTagClickable = () => Boolean(props.filePath && props.onOpen);

  const handleContainerPointerDown = (event: PointerEvent) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
    const isEditableInputVisible =
      canInteract() && props.isPromptMode && !props.isPendingDismiss;
    if (isEditableInputVisible && inputRef) {
      inputRef.focus();
    }
  };

  const handleSubmit = () => {
    props.onSubmit?.();
  };

  const shouldPersistDuringFade = () =>
    hadValidBounds() && (isCompletedStatus() || props.status === "error");

  return (
    <Show
      when={
        props.visible !== false &&
        (props.selectionBounds || shouldPersistDuringFade())
      }
    >
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        data-react-grab-selection-label
        class="fixed font-sans text-[13px] antialiased transition-opacity duration-100 ease-out filter-[drop-shadow(0px_0px_4px_#51515180)] select-none"
        style={{
          top: `${computedPosition().top}px`,
          left: `${computedPosition().left}px`,
          transform: `translateX(calc(-50% + ${computedPosition().edgeOffsetX}px))`,
          "z-index": "2147483647",
          "pointer-events": shouldEnablePointerEvents() ? "auto" : "none",
          opacity: props.status === "fading" || isInternalFading() ? 0 : 1,
        }}
        onPointerDown={handleContainerPointerDown}
        onMouseDown={(event) => {
          event.stopPropagation();
          event.stopImmediatePropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          event.stopImmediatePropagation();
        }}
      >
        <Arrow
          position={arrowPosition()}
          leftPercent={computedPosition().arrowLeftPercent}
          leftOffsetPx={computedPosition().arrowLeftOffset}
        />

        <Show when={isCompletedStatus() && !props.error}>
          <CompletionView
            statusText={
              props.hasAgent ? (props.statusText ?? "Completed") : "Copied"
            }
            supportsUndo={props.supportsUndo}
            supportsFollowUp={props.supportsFollowUp}
            dismissButtonText={props.dismissButtonText}
            previousPrompt={props.previousPrompt}
            onDismiss={props.onDismiss}
            onUndo={props.onUndo}
            onFollowUpSubmit={props.onFollowUpSubmit}
            onCopyStateChange={() => {
                queueMicrotask(measureContainer);
              }}
            onFadingChange={setIsInternalFading}
            onShowContextMenu={props.onShowContextMenu}
          />
        </Show>

        <div
          class="[font-synthesis:none] contain-layout flex items-center gap-[5px] rounded-sm bg-white antialiased w-fit h-fit p-0"
          style={{
            display: isCompletedStatus() && !props.error ? "none" : undefined,
          }}
        >
          <Show when={props.status === "copying" && !props.isPendingAbort}>
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit max-w-[280px]">
              <div class="contain-layout shrink-0 flex items-center gap-1 py-1 px-1.5 w-auto h-fit">
                <span class="text-[13px] leading-4 font-sans font-medium w-auto h-fit whitespace-normal text-[#71717a] animate-pulse tabular-nums">
                  {props.statusText ?? "Grabbing…"}
                </span>
              </div>
              <Show when={props.hasAgent && props.inputValue}>
                <BottomSection>
                  <div class="shrink-0 flex justify-between items-end w-full min-h-4">
                    <textarea
                      ref={inputRef}
                      data-react-grab-ignore-events
                      class="text-black text-[13px] leading-4 font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 opacity-50 wrap-break-word overflow-y-auto"
                      style={{
                        "field-sizing": "content",
                        "min-height": "16px",
                        "max-height": "95px",
                        "scrollbar-width": "none",
                      }}
                      value={props.inputValue ?? ""}
                      placeholder="type to edit"
                      rows={1}
                      disabled
                    />
                    <Show when={props.onAbort}>
                      <button
                        data-react-grab-ignore-events
                        data-react-grab-abort
                        class="contain-layout shrink-0 size-fit cursor-pointer ml-1 hover:scale-105"
                        onPointerDown={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                        onPointerUp={(event) => {
                          event.stopPropagation();
                          props.onAbort?.();
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          props.onAbort?.();
                        }}
                      >
                        <IconStop size={16} class="text-black" />
                      </button>
                    </Show>
                  </div>
                </BottomSection>
              </Show>
            </div>
          </Show>

          <Show when={props.status === "copying" && props.isPendingAbort}>
            <DiscardPrompt
              onConfirm={props.onConfirmAbort}
              onCancel={props.onCancelAbort}
            />
          </Show>

          <Show when={canInteract() && !props.isPromptMode}>
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 w-fit h-fit pl-1.5 pr-1">
                <TagBadge
                  tagName={tagDisplay()}
                  componentName={componentNameDisplay()}
                  isClickable={isTagClickable()}
                  onClick={handleTagClick}
                  onHoverChange={handleTagHoverChange}
                  shrink
                  forceShowIcon={showOpenIndicator()}
                />
              </div>
              <BottomSection>
                <ActionPill
                  onClick={handleSubmit}
                  shrink
                  hasAgent={props.hasAgent}
                  isIdle={isIdle()}
                  showOpenIndicator={showOpenIndicator()}
                />
              </BottomSection>
            </div>
          </Show>

          <Show
            when={
              canInteract() && props.isPromptMode && !props.isPendingDismiss
            }
          >
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit max-w-[280px]">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 w-fit h-fit pl-1.5 pr-1">
                <ActionPill
                  onClick={handleSubmit}
                  dimmed
                  shrink
                  hasAgent={props.hasAgent}
                  isEditing
                  showOpenIndicator={showOpenIndicator()}
                />
                <TagBadge
                  tagName={tagDisplay()}
                  componentName={componentNameDisplay()}
                  isClickable={isTagClickable()}
                  onClick={handleTagClick}
                  onHoverChange={handleTagHoverChange}
                  shrink
                  forceShowIcon
                />
              </div>
              <BottomSection>
                <Show when={props.replyToPrompt}>
                  <div class="shrink-0 flex items-center gap-0.5 w-full mb-0.5 overflow-hidden">
                    <span class="text-[#a1a1aa] text-[10px] leading-3 shrink-0">
                      {">previously:"}
                    </span>
                    <span class="text-[#a1a1aa] text-[10px] leading-3 italic truncate whitespace-nowrap">
                      {props.replyToPrompt}
                    </span>
                  </div>
                </Show>
                <div class="shrink-0 flex justify-between items-end w-full min-h-4">
                  <textarea
                    ref={inputRef}
                    data-react-grab-ignore-events
                    data-react-grab-input
                    class="text-black text-[13px] leading-4 font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 wrap-break-word overflow-y-auto"
                    style={{
                      "field-sizing": "content",
                      "min-height": "16px",
                      "max-height": "95px",
                      "scrollbar-width": "none",
                    }}
                    value={props.inputValue ?? ""}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="type prompt"
                    rows={1}
                  />
                  <button
                    data-react-grab-submit
                    class={cn(
                      "contain-layout shrink-0 size-fit cursor-pointer transition-all hover:scale-105 ml-1",
                      !props.inputValue?.trim() && "opacity-35",
                    )}
                    onClick={handleSubmit}
                  >
                    <IconSubmit size={16} class="text-black" />
                  </button>
                </div>
              </BottomSection>
            </div>
          </Show>

          <Show when={props.isPendingDismiss}>
            <DiscardPrompt
              onConfirm={props.onConfirmDismiss}
              onCancel={props.onCancelDismiss}
            />
          </Show>

          <Show when={props.error}>
            <ErrorView
              error={props.error!}
              onAcknowledge={props.onAcknowledgeError}
              onRetry={props.onRetry}
            />
          </Show>
        </div>
      </div>
    </Show>
  );
};
