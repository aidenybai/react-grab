import {
  Show,
  For,
  createSignal,
  createEffect,
  createMemo,
  on,
  onMount,
  onCleanup,
} from "solid-js";
import type { Component } from "solid-js";
import type { ArrowPosition, SelectionLabelProps } from "../../types.js";
import {
  IME_COMPOSING_KEY_CODE,
  VIEWPORT_MARGIN_PX,
  ARROW_CENTER_PERCENT,
  ARROW_LABEL_MARGIN_PX,
  LABEL_GAP_PX,
  SELECTION_LABEL_OFFSCREEN_PX,
  TEXTAREA_MAX_HEIGHT_PX,
  Z_INDEX_LABEL,
} from "../../constants.js";
import { autoResizeTextarea } from "../../utils/auto-resize-textarea.js";
import { getArrowSize } from "../../utils/get-arrow-size.js";
import { isKeyboardEventTriggeredByInput } from "../../utils/is-keyboard-event-triggered-by-input.js";
import { cn } from "../../utils/cn.js";
import { getTagDisplay } from "../../utils/get-tag-display.js";
import { formatShortcut } from "../../utils/format-shortcut.js";
import { IconReply } from "../icons/icon-reply.jsx";
import { IconSubmit } from "../icons/icon-submit.jsx";
import { IconLoader } from "../icons/icon-loader.jsx";
import { Arrow } from "./arrow.js";
import { TagBadge } from "./tag-badge.js";
import { BottomSection } from "./bottom-section.js";
import { DiscardPrompt } from "./discard-prompt.js";
import { ErrorView } from "./error-view.js";
import { CompletionView } from "./completion-view.js";
import { ArrowNavigationMenu } from "./arrow-navigation-menu.js";

interface LabelPosition {
  left: number;
  top: number;
  arrowLeftPercent: number;
  arrowLeftOffset: number;
  edgeOffsetX: number;
}

const DEFAULT_OFFSCREEN_POSITION: LabelPosition = {
  left: SELECTION_LABEL_OFFSCREEN_PX,
  top: SELECTION_LABEL_OFFSCREEN_PX,
  arrowLeftPercent: ARROW_CENTER_PERCENT,
  arrowLeftOffset: 0,
  edgeOffsetX: 0,
};

interface PositionResult {
  position: LabelPosition;
  computedArrowPosition: ArrowPosition | null;
  hadValidBounds: boolean;
  elementIdentity: string;
}

export const SelectionLabel: Component<SelectionLabelProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let panelRef: HTMLDivElement | undefined;
  let inputRef: HTMLTextAreaElement | undefined;
  let isTagCurrentlyHovered = false;

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [panelWidth, setPanelWidth] = createSignal(0);
  const [viewportVersion, setViewportVersion] = createSignal(0);
  const [isInternalFading, setIsInternalFading] = createSignal(false);
  const [isShaking, setIsShaking] = createSignal(false);

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
    if (props.arrowNavigationState?.isVisible) return true;
    return false;
  };

  let resizeObserver: ResizeObserver | undefined;

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
      event.stopImmediatePropagation();
      props.onToggleExpand?.();
    } else if (isCtrlCToAbort) {
      event.preventDefault();
      event.stopImmediatePropagation();
      props.onAbort?.();
    }
  };

  onMount(() => {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.target.getBoundingClientRect();
        if (entry.target === containerRef && !isTagCurrentlyHovered) {
          setMeasuredWidth(rect.width);
          setMeasuredHeight(rect.height);
        } else if (entry.target === panelRef) {
          setPanelWidth(rect.width);
        }
      }
    });
    if (containerRef) {
      const rect = containerRef.getBoundingClientRect();
      setMeasuredWidth(rect.width);
      setMeasuredHeight(rect.height);
      resizeObserver.observe(containerRef);
    }
    if (panelRef) {
      setPanelWidth(panelRef.getBoundingClientRect().width);
      resizeObserver.observe(panelRef);
    }
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);
    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true });
  });

  onCleanup(() => {
    resizeObserver?.disconnect();
    window.removeEventListener("scroll", handleViewportChange, true);
    window.removeEventListener("resize", handleViewportChange);
    window.visualViewport?.removeEventListener("resize", handleViewportChange);
    window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    window.removeEventListener("keydown", handleGlobalKeyDown, {
      capture: true,
    });
  });

  const elementIdentity = () =>
    `${props.tagName ?? ""}:${props.componentName ?? ""}`;

  createEffect(() => {
    if (props.isPromptMode && inputRef && props.onSubmit) {
      // HACK: Defer focus one tick so the textarea is fully mounted.
      const focusTimeout = setTimeout(() => {
        if (inputRef) {
          inputRef.focus();
          autoResizeTextarea(inputRef, TEXTAREA_MAX_HEIGHT_PX);
        }
      }, 0);
      onCleanup(() => {
        clearTimeout(focusTimeout);
      });
    }
  });

  const positionComputation = createMemo(
    (previousResult: PositionResult): PositionResult => {
      viewportVersion();
      const currentElementIdentity = elementIdentity();
      const didReset = currentElementIdentity !== previousResult.elementIdentity;
      const cached = didReset
        ? {
            position: DEFAULT_OFFSCREEN_POSITION,
            computedArrowPosition: null as ArrowPosition | null,
            hadValidBounds: false,
            elementIdentity: currentElementIdentity,
          }
        : previousResult;

      const bounds = props.selectionBounds;
      const labelWidth = measuredWidth();
      const labelHeight = measuredHeight();
      const hasMeasurements = labelWidth > 0 && labelHeight > 0;
      const hasValidBounds = bounds && bounds.width > 0 && bounds.height > 0;

      if (!hasMeasurements || !hasValidBounds) {
        return {
          position: cached.hadValidBounds
            ? cached.position
            : DEFAULT_OFFSCREEN_POSITION,
          computedArrowPosition: cached.computedArrowPosition,
          hadValidBounds: cached.hadValidBounds,
          elementIdentity: currentElementIdentity,
        };
      }

      const visualViewport = window.visualViewport;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportRight =
        viewportLeft + (visualViewport?.width ?? window.innerWidth);
      const viewportBottom =
        viewportTop + (visualViewport?.height ?? window.innerHeight);

      const isSelectionVisibleInViewport =
        bounds.x + bounds.width > viewportLeft &&
        bounds.x < viewportRight &&
        bounds.y + bounds.height > viewportTop &&
        bounds.y < viewportBottom;

      if (!isSelectionVisibleInViewport) {
        return {
          position: DEFAULT_OFFSCREEN_POSITION,
          computedArrowPosition: cached.computedArrowPosition,
          hadValidBounds: cached.hadValidBounds,
          elementIdentity: currentElementIdentity,
        };
      }

      const selectionCenterX = bounds.x + bounds.width / 2;
      const cursorX = props.mouseX ?? selectionCenterX;
      const selectionBottom = bounds.y + bounds.height;
      const selectionTop = bounds.y;

      const actualArrowHeight = props.hideArrow
        ? 0
        : getArrowSize(panelWidth());

      // HACK: Use cursorX as anchor point, CSS transform handles centering via translateX(-50%)
      // This avoids the flicker when content changes because centering doesn't depend on JS measurement
      const anchorX = cursorX;
      let edgeOffsetX = 0;
      let positionTop = selectionBottom + actualArrowHeight + LABEL_GAP_PX;

      if (labelWidth > 0) {
        const labelLeft = anchorX - labelWidth / 2;
        const labelRight = anchorX + labelWidth / 2;

        if (labelRight > viewportRight - VIEWPORT_MARGIN_PX) {
          edgeOffsetX = viewportRight - VIEWPORT_MARGIN_PX - labelRight;
        }
        if (labelLeft + edgeOffsetX < viewportLeft + VIEWPORT_MARGIN_PX) {
          edgeOffsetX = viewportLeft + VIEWPORT_MARGIN_PX - labelLeft;
        }
      }

      const totalHeightNeeded = labelHeight + actualArrowHeight + LABEL_GAP_PX;
      const fitsBelow =
        positionTop + labelHeight <= viewportBottom - VIEWPORT_MARGIN_PX;

      if (!fitsBelow) {
        positionTop = selectionTop - totalHeightNeeded;
      }

      if (positionTop < viewportTop + VIEWPORT_MARGIN_PX) {
        positionTop = viewportTop + VIEWPORT_MARGIN_PX;
      }

      const arrowLeftPercent = ARROW_CENTER_PERCENT;
      const labelHalfWidth = labelWidth / 2;
      const arrowCenterPx = labelHalfWidth - edgeOffsetX;
      const arrowMinPx = Math.min(ARROW_LABEL_MARGIN_PX, labelHalfWidth);
      const arrowMaxPx = Math.max(
        labelWidth - ARROW_LABEL_MARGIN_PX,
        labelHalfWidth,
      );
      const clampedArrowCenterPx = Math.max(
        arrowMinPx,
        Math.min(arrowMaxPx, arrowCenterPx),
      );
      const arrowLeftOffset = clampedArrowCenterPx - labelHalfWidth;

      const computedArrowPosition: ArrowPosition = fitsBelow ? "bottom" : "top";

      return {
        position: {
          left: anchorX,
          top: positionTop,
          arrowLeftPercent,
          arrowLeftOffset,
          edgeOffsetX,
        },
        computedArrowPosition,
        hadValidBounds: true,
        elementIdentity: currentElementIdentity,
      };
    },
    {
      position: DEFAULT_OFFSCREEN_POSITION,
      computedArrowPosition: null as ArrowPosition | null,
      hadValidBounds: false,
      elementIdentity: "",
    },
  );

  const arrowPosition = () =>
    positionComputation().computedArrowPosition ?? "bottom";
  const hadValidBounds = () => positionComputation().hadValidBounds;

  createEffect(
    on(
      () => props.selectionLabelShakeCount,
      () => setIsShaking(true),
      { defer: true },
    ),
  );

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.keyCode === IME_COMPOSING_KEY_CODE) {
      return;
    }

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
    const inputTarget = event.target;
    if (!(inputTarget instanceof HTMLTextAreaElement)) {
      return;
    }
    autoResizeTextarea(inputTarget, TEXTAREA_MAX_HEIGHT_PX);
    props.onInputChange?.(inputTarget.value);
  };

  const tagDisplayResult = () =>
    getTagDisplay({
      tagName: props.tagName,
      componentName: props.componentName,
      elementsCount: props.elementsCount,
    });

  const isArrowNavigationVisible = () =>
    Boolean(props.arrowNavigationState?.isVisible);

  const handleTagClick = (event: MouseEvent) => {
    event.stopImmediatePropagation();
    if (props.filePath && props.onOpen) {
      props.onOpen();
    }
  };

  const handleContainerPointerDown = (event: PointerEvent) => {
    event.stopImmediatePropagation();
    const isEditableInputVisible =
      canInteract() &&
      props.isPromptMode &&
      !props.isPendingDismiss &&
      props.onSubmit;
    if (isEditableInputVisible && inputRef) {
      inputRef.focus();
    }
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
          top: `${positionComputation().position.top}px`,
          left: `${positionComputation().position.left}px`,
          transform: `translateX(calc(-50% + ${positionComputation().position.edgeOffsetX}px))`,
          "z-index": `${Z_INDEX_LABEL}`,
          "pointer-events": shouldEnablePointerEvents() ? "auto" : "none",
          opacity: props.status === "fading" || isInternalFading() ? 0 : 1,
        }}
        onPointerDown={handleContainerPointerDown}
        onClick={(event) => {
          event.stopImmediatePropagation();
        }}
        onMouseEnter={() => props.onHoverChange?.(true)}
        onMouseLeave={() => props.onHoverChange?.(false)}
      >
        <Show when={!props.hideArrow}>
          <Arrow
            position={arrowPosition()}
            leftPercent={positionComputation().position.arrowLeftPercent}
            leftOffsetPx={positionComputation().position.arrowLeftOffset}
            labelWidth={panelWidth()}
          />
        </Show>

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
            onFadingChange={setIsInternalFading}
            onShowContextMenu={props.onShowContextMenu}
          />
        </Show>

        <div
          ref={panelRef}
          class={cn(
            "contain-layout flex items-center gap-[5px] rounded-[10px] antialiased w-fit h-fit p-0 [font-synthesis:none] [corner-shape:superellipse(1.25)]",
            "bg-white",
            isShaking() && "animate-shake",
          )}
          style={{
            display: isCompletedStatus() && !props.error ? "none" : undefined,
          }}
          onAnimationEnd={() => setIsShaking(false)}
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
                      class="text-black text-[13px] leading-4 font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 opacity-50 wrap-break-word overflow-y-auto"
                      style={{
                        "field-sizing": "content",
                        "min-height": "16px",
                        "max-height": `${TEXTAREA_MAX_HEIGHT_PX}px`,
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
                        class="contain-layout shrink-0 flex items-center justify-center size-4 rounded-full bg-black cursor-pointer ml-1 interactive-scale"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          props.onAbort?.();
                        }}
                      >
                        <div class="size-1.5 bg-white rounded-[1px]" />
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
            <div
              class="contain-layout shrink-0 flex flex-col items-start w-fit h-fit"
              classList={{ "min-w-[100px]": isArrowNavigationVisible() }}
            >
              <div
                class="contain-layout shrink-0 flex items-center gap-1 w-fit h-fit px-2"
                classList={{
                  "py-1.5": !isArrowNavigationVisible(),
                  "pt-1.5 pb-1": isArrowNavigationVisible(),
                }}
              >
                <TagBadge
                  tagName={tagDisplayResult().tagName}
                  componentName={tagDisplayResult().componentName}
                  isClickable={Boolean(props.filePath && props.onOpen)}
                  onClick={handleTagClick}
                  onHoverChange={handleTagHoverChange}
                  shrink
                  forceShowIcon={
                    isArrowNavigationVisible()
                      ? Boolean(props.filePath && props.onOpen)
                      : Boolean(props.isContextMenuOpen)
                  }
                />
              </div>
              <Show when={props.arrowNavigationState?.isVisible}>
                <ArrowNavigationMenu
                  items={props.arrowNavigationState!.items}
                  activeIndex={props.arrowNavigationState!.activeIndex}
                  onSelect={(index) => props.onArrowNavigationSelect?.(index)}
                />
              </Show>
              <Show
                when={
                  !isArrowNavigationVisible() &&
                  Boolean(props.actionCycleState?.isVisible)
                }
              >
                <BottomSection>
                  <div class="flex flex-col w-[calc(100%+16px)] -mx-2 -my-1.5">
                    <For each={props.actionCycleState?.items ?? []}>
                      {(item, itemIndex) => (
                        <div
                          data-react-grab-action-cycle-item={item.label.toLowerCase()}
                          class="contain-layout flex items-center justify-between w-full px-2 py-1 transition-colors"
                          classList={{
                            "bg-black/5":
                              itemIndex() ===
                              (props.actionCycleState?.activeIndex ?? 0),
                            "rounded-b-[6px]":
                              itemIndex() ===
                              (props.actionCycleState?.items ?? []).length - 1,
                          }}
                        >
                          <span class="text-[13px] leading-4 font-sans font-medium text-black">
                            {item.label}
                          </span>
                          <Show when={item.shortcut}>
                            <span class="text-[11px] font-sans text-black/50 ml-4">
                              {formatShortcut(item.shortcut!)}
                            </span>
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                </BottomSection>
              </Show>
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
                  tagName={tagDisplayResult().tagName}
                  componentName={tagDisplayResult().componentName}
                  isClickable={Boolean(props.filePath && props.onOpen)}
                  onClick={handleTagClick}
                  onHoverChange={handleTagHoverChange}
                  forceShowIcon
                />
              </div>
              <BottomSection>
                <Show when={props.replyToPrompt}>
                  <div class="flex items-center gap-1 w-full mb-1 overflow-hidden">
                    <IconReply size={10} class="text-black/30 shrink-0" />
                    <span class="text-black/40 text-[11px] leading-3 font-medium truncate italic">
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
                    class="text-black text-[13px] leading-4 font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 wrap-break-word overflow-y-auto"
                    style={{
                      "field-sizing": "content",
                      "min-height": "16px",
                      "max-height": `${TEXTAREA_MAX_HEIGHT_PX}px`,
                      "scrollbar-width": "none",
                    }}
                    value={props.inputValue ?? ""}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Add context"
                    rows={1}
                    readOnly={!props.onSubmit}
                  />
                  <Show when={props.onSubmit}>
                    <button
                      data-react-grab-submit
                      class="contain-layout shrink-0 flex items-center justify-center size-4 rounded-full bg-black cursor-pointer ml-1 interactive-scale"
                      onClick={() => props.onSubmit?.()}
                    >
                      <IconSubmit size={10} class="text-white" />
                    </button>
                  </Show>
                </div>
              </BottomSection>
            </div>
          </Show>

          <Show when={props.isPendingDismiss}>
            <DiscardPrompt
              onConfirm={props.onConfirmDismiss}
              onCancel={() => {
                props.onCancelDismiss?.();
                inputRef?.focus();
              }}
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
