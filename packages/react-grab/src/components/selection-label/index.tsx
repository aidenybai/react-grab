import { Show, createSignal, createEffect, onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { ArrowPosition, SelectionLabelProps } from "../../types.js";
import {
  VIEWPORT_MARGIN_PX,
  ARROW_HEIGHT_PX,
  ARROW_CENTER_PERCENT,
  LABEL_GAP_PX,
  PANEL_STYLES,
  TEXT_PRIMARY,
  TEXT_MUTED,
  MODE,
} from "../../constants.js";
import { isKeyboardEventTriggeredByInput } from "../../utils/is-keyboard-event-triggered-by-input.js";
import { cn } from "../../utils/cn.js";
import { getTagDisplay } from "../../utils/get-tag-display.js";
import { IconReply } from "../icons/icon-reply.jsx";
import { IconSubmit } from "../icons/icon-submit.jsx";
import { IconLoader } from "../icons/icon-loader.jsx";
import { Arrow } from "./arrow.js";
import { TagBadge } from "./tag-badge.js";
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
  const [hadValidBounds, setHadValidBounds] = createSignal(false);
  const [isInternalFading, setIsInternalFading] = createSignal(false);

  const canInteract = () =>
    props.status !== "copying" &&
    props.status !== "copied" &&
    props.status !== "fading" &&
    props.status !== "error";

  const isCompletedStatus = () =>
    props.status === "copied" || props.status === "fading";

  const shouldEnablePointerEvents = (): boolean => {
    if (props.isPromptMode) return true;
    if (isCompletedStatus() && (props.onDismiss || props.onShowContextMenu)) {
      return true;
    }
    if (props.status === "copying" && props.onAbort) return true;
    if (
      props.status === "error" &&
      (props.onAcknowledgeError || props.onRetry)
    ) {
      return true;
    }
    return false;
  };

  const showOpenIndicator = () => Boolean(props.isContextMenuOpen);

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
  });

  onCleanup(() => {
    window.removeEventListener("scroll", handleViewportChange, true);
    window.removeEventListener("resize", handleViewportChange);
    window.removeEventListener("keydown", handleGlobalKeyDown, {
      capture: true,
    });
  });

  createEffect(() => {
    const elementIdentity = `${props.tagName ?? ""}:${props.componentName ?? ""}`;
    if (elementIdentity !== lastElementIdentity) {
      lastElementIdentity = elementIdentity;
      lastValidPosition = null;
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
    // HACK: use queueMicrotask instead of RAF to measure sooner after content changes
    // This prevents the flicker when transitioning between states (e.g., clicking "Keep")
    queueMicrotask(measureContainer);
  });

  createEffect(() => {
    if (props.isPromptMode && inputRef) {
      // HACK: setTimeout(0) defers focus to the next event loop tick to ensure
      // the textarea is fully mounted and ready to receive focus
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

    const position = {
      left: anchorX,
      top: positionTop,
      arrowLeftPercent,
      arrowLeftOffset,
      edgeOffsetX,
    };
    lastValidPosition = position;
    setHadValidBounds(true);

    return position;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.keyCode === 229) {
      return;
    }

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
        class={cn(
          "fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none transition-opacity duration-100 ease-out",
        )}
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
        onMouseEnter={() => props.onHoverChange?.(true)}
        onMouseLeave={() => props.onHoverChange?.(false)}
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
          class={cn(
            "contain-layout flex items-center gap-[5px] rounded-[10px] antialiased w-fit h-fit p-0 [font-synthesis:none] [corner-shape:superellipse(1.25)]",
            PANEL_STYLES,
          )}
          style={{
            display: isCompletedStatus() && !props.error ? "none" : undefined,
          }}
        >
          <Show when={props.status === "copying" && !props.isPendingAbort}>
            <div
              class="contain-layout shrink-0 flex flex-col justify-center items-start w-fit h-fit max-w-[280px]"
              classList={{
                "min-w-[150px]": Boolean(props.hasAgent && props.inputValue),
              }}
            >
              <div class="contain-layout shrink-0 flex items-center gap-1 py-1.5 px-2 w-full h-fit">
                <IconLoader size={13} class="text-[#71717a] shrink-0" />
                <span class="shimmer-text text-[13px] leading-4 font-sans font-medium h-fit tabular-nums overflow-hidden text-ellipsis whitespace-nowrap">
                  {props.statusText ?? "Grabbing…"}
                </span>
              </div>
              <Show when={props.hasAgent && props.inputValue}>
                <BottomSection>
                  <div class="shrink-0 flex justify-between items-end w-full min-h-4">
                    <textarea
                      ref={inputRef}
                      data-react-grab-ignore-events
                      class={cn(
                        "text-[13px] leading-4 font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 opacity-50 wrap-break-word overflow-y-auto",
                        TEXT_PRIMARY,
                      )}
                      style={{
                        "field-sizing": "content",
                        "min-height": "16px",
                        "max-height": "95px",
                        "scrollbar-width": "none",
                      }}
                      value={props.inputValue ?? ""}
                      placeholder="Add context"
                      rows={1}
                      disabled
                    />
                    <Show when={props.onAbort}>
                      <button
                        data-react-grab-ignore-events
                        data-react-grab-abort
                        class={cn(
                          "contain-layout shrink-0 flex items-center justify-center size-4 rounded-full cursor-pointer ml-1 interactive-scale",
                          MODE === "dark" ? "bg-white" : "bg-black",
                        )}
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
                        <div
                          class={cn(
                            "size-1.5 rounded-[1px]",
                            MODE === "dark" ? "bg-black" : "bg-white",
                          )}
                        />
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
            <div class="contain-layout shrink-0 flex items-center gap-1 py-1.5 w-fit h-fit px-2">
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
          </Show>

          <Show
            when={
              canInteract() && props.isPromptMode && !props.isPendingDismiss
            }
          >
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start w-fit h-fit min-w-[150px] max-w-[280px]">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 w-fit h-fit px-2 max-w-full">
                <TagBadge
                  tagName={tagDisplay()}
                  componentName={componentNameDisplay()}
                  isClickable={isTagClickable()}
                  onClick={handleTagClick}
                  onHoverChange={handleTagHoverChange}
                  forceShowIcon
                />
              </div>
              <BottomSection>
                <Show when={props.replyToPrompt}>
                  <div class="flex items-center gap-1 w-full mb-1 overflow-hidden">
                    <IconReply size={10} class={cn("shrink-0", TEXT_MUTED)} />
                    <span
                      class={cn(
                        "text-[11px] leading-3 font-medium truncate italic",
                        TEXT_MUTED,
                      )}
                    >
                      {props.replyToPrompt}
                    </span>
                  </div>
                </Show>
                <div
                  class="shrink-0 flex justify-between items-end w-full min-h-4"
                  style={{ "padding-left": props.replyToPrompt ? "14px" : "0" }}
                >
                  <textarea
                    ref={inputRef}
                    data-react-grab-ignore-events
                    data-react-grab-input
                    class={cn(
                      "text-[13px] leading-4 font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 wrap-break-word overflow-y-auto",
                      TEXT_PRIMARY,
                    )}
                    style={{
                      "field-sizing": "content",
                      "min-height": "16px",
                      "max-height": "95px",
                      "scrollbar-width": "none",
                    }}
                    value={props.inputValue ?? ""}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Add context"
                    rows={1}
                  />
                  <button
                    data-react-grab-submit
                    class={cn(
                      "contain-layout shrink-0 flex items-center justify-center size-4 rounded-full cursor-pointer ml-1 interactive-scale",
                      MODE === "dark" ? "bg-white" : "bg-black",
                    )}
                    onClick={handleSubmit}
                  >
                    <IconSubmit
                      size={10}
                      class={MODE === "dark" ? "text-black" : "text-white"}
                    />
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
