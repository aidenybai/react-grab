import { Show, createSignal, createEffect, onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { ArrowPosition, SelectionLabelProps } from "../../types.js";
import {
  VIEWPORT_MARGIN_PX,
  ARROW_HEIGHT_PX,
  LABEL_GAP_PX,
  IDLE_TIMEOUT_MS,
} from "../../constants.js";
import { isKeyboardEventTriggeredByInput } from "../../utils/is-keyboard-event-triggered-by-input.js";
import { IconReturn } from "../icons/icon-return.jsx";
import { Arrow } from "./arrow.js";
import { TagBadge } from "./tag-badge.js";
import { ActionPill } from "./action-pill.js";
import { BottomSection } from "./bottom-section.js";
import { DiscardPrompt } from "./discard-prompt.js";
import { ErrorView } from "./error-view.js";
import { CompletionView } from "./completion-view.js";

export const SelectionLabel: Component<SelectionLabelProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let inputRef: HTMLTextAreaElement | undefined;
  let isTagCurrentlyHovered = false;
  let lastValidPosition: {
    left: number;
    top: number;
    arrowLeft: number;
  } | null = null;
  let lastElementIdentity: string | null = null;

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [arrowPosition, setArrowPosition] =
    createSignal<ArrowPosition>("bottom");
  const [viewportVersion, setViewportVersion] = createSignal(0);
  const [isIdle, setIsIdle] = createSignal(false);
  const [hadValidBounds, setHadValidBounds] = createSignal(false);

  const canInteract = () =>
    props.status !== "copying" &&
    props.status !== "copied" &&
    props.status !== "fading";

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
    if (
      event.code === "Enter" &&
      isIdle() &&
      !props.isPromptMode &&
      canInteract()
    ) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      props.onToggleExpand?.();
    } else if (
      event.code === "KeyC" &&
      event.ctrlKey &&
      props.status === "copying" &&
      props.onAbort
    ) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      props.onAbort();
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
    requestAnimationFrame(measureContainer);
  });

  createEffect(() => {
    if (props.visible) {
      requestAnimationFrame(measureContainer);
    }
  });

  createEffect(() => {
    void props.status;
    requestAnimationFrame(measureContainer);
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
      return lastValidPosition ?? { left: -9999, top: -9999, arrowLeft: 0 };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const selectionCenterX = bounds.x + bounds.width / 2;
    const cursorX = props.mouseX ?? selectionCenterX;
    const selectionBottom = bounds.y + bounds.height;
    const selectionTop = bounds.y;

    let positionLeft = cursorX - labelWidth / 2;
    let positionTop = selectionBottom + ARROW_HEIGHT_PX + LABEL_GAP_PX;

    if (positionLeft + labelWidth > viewportWidth - VIEWPORT_MARGIN_PX) {
      positionLeft = viewportWidth - labelWidth - VIEWPORT_MARGIN_PX;
    }
    if (positionLeft < VIEWPORT_MARGIN_PX) {
      positionLeft = VIEWPORT_MARGIN_PX;
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

    const arrowLeft = Math.max(
      12,
      Math.min(cursorX - positionLeft, labelWidth - 12),
    );

    const position = { left: positionLeft, top: positionTop, arrowLeft };
    lastValidPosition = position;
    setHadValidBounds(true);

    return position;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (event.code === "Enter" && !event.shiftKey) {
      event.preventDefault();
      props.onSubmit?.();
    } else if (event.code === "Escape") {
      event.preventDefault();
      props.onConfirmDismiss?.();
    }
  };

  const handleInput = (event: InputEvent) => {
    const target = event.target as HTMLTextAreaElement;
    props.onInputChange?.(target.value);
  };

  const tagDisplay = () => {
    if (props.elementsCount && props.elementsCount > 1) {
      return `${props.elementsCount} elements`;
    }
    if (props.componentName && props.tagName) {
      return `${props.componentName}.${props.tagName}`;
    }
    return props.componentName || props.tagName || "element";
  };

  const handleTagClick = (event: MouseEvent) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (props.filePath && props.onOpen) {
      props.onOpen();
    }
  };

  const isTagClickable = () => Boolean(props.filePath && props.onOpen);

  const stopPropagation = (event: Event) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  const handleContainerPointerDown = (event: PointerEvent) => {
    stopPropagation(event);
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
    hadValidBounds() &&
    (props.status === "copied" ||
      props.status === "fading" ||
      props.status === "error");

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
          "z-index": "2147483647",
          "pointer-events":
            props.isPromptMode ||
            ((props.status === "copied" || props.status === "fading") &&
              (props.onDismiss || props.onShowContextMenu)) ||
            (props.status === "copying" && props.onAbort)
              ? "auto"
              : "none",
          opacity: props.status === "fading" ? 0 : 1,
        }}
        onPointerDown={handleContainerPointerDown}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      >
        <Arrow
          position={arrowPosition()}
          leftPx={computedPosition().arrowLeft}
        />

        <Show
          when={
            (props.status === "copied" || props.status === "fading") &&
            !props.error
          }
        >
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
            onCopyStateChange={() => requestAnimationFrame(measureContainer)}
            onShowContextMenu={props.onShowContextMenu}
          />
        </Show>

        <div
          class="[font-synthesis:none] contain-layout flex items-center gap-[5px] rounded-sm bg-white antialiased w-fit h-fit p-0"
          style={{
            display:
              (props.status === "copied" || props.status === "fading") &&
              !props.error
                ? "none"
                : undefined,
          }}
        >
          <Show when={props.status === "copying" && !props.isPendingAbort}>
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit max-w-[280px]">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 px-1.5 w-auto h-fit">
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
                        class="contain-layout shrink-0 flex flex-col items-start rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] p-1 size-fit cursor-pointer ml-1 transition-none hover:scale-105"
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
                          data-react-grab-ignore-events
                          class="shrink-0 w-[7px] h-[7px] rounded-[1px] bg-black pointer-events-none"
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
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 w-fit h-fit pl-1.5 pr-1">
                <TagBadge
                  tagName={tagDisplay()}
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
                    class="contain-layout shrink-0 flex flex-col items-start px-[3px] py-[3px] rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] size-fit cursor-pointer transition-all hover:scale-105 ml-1"
                    onClick={handleSubmit}
                  >
                    <IconReturn size={10} class="opacity-[0.99] text-black" />
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
