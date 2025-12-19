import {
  Show,
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  type JSX,
} from "solid-js";
import type { Component } from "solid-js";
import type { OverlayBounds, SelectionLabelStatus } from "../types.js";
import { VIEWPORT_MARGIN_PX, COPIED_LABEL_DURATION_MS } from "../constants.js";
import { cn } from "../utils/cn.js";
import { IconOpen } from "./icon-open.js";
import { IconReturn } from "./icon-return.js";
import { IconRetry } from "./icon-retry.js";
import { isKeyboardEventTriggeredByInput } from "../utils/is-keyboard-event-triggered-by-input.js";

interface SelectionLabelProps {
  tagName?: string;
  componentName?: string;
  selectionBounds?: OverlayBounds;
  mouseX?: number;
  mouseY?: number;
  visible?: boolean;
  isInputExpanded?: boolean;
  inputValue?: string;
  replyToPrompt?: string;
  previousPrompt?: string;
  hasAgent?: boolean;
  isAgentConnected?: boolean;
  status?: SelectionLabelStatus;
  statusText?: string;
  filePath?: string;
  lineNumber?: number;
  supportsUndo?: boolean;
  supportsFollowUp?: boolean;
  dismissButtonText?: string;
  onInputChange?: (value: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  onToggleExpand?: () => void;
  onAbort?: () => void;
  onOpen?: () => void;
  onDismiss?: () => void;
  onUndo?: () => void;
  onFollowUpSubmit?: (prompt: string) => void;
  isPendingDismiss?: boolean;
  onConfirmDismiss?: () => void;
  onCancelDismiss?: () => void;
  isPendingAbort?: boolean;
  onConfirmAbort?: () => void;
  onCancelAbort?: () => void;
  error?: string;
  onAcknowledgeError?: () => void;
  onRetry?: () => void;
}

interface GeneratingIndicatorProps {
  isActive: boolean;
}

const GeneratingIndicator: Component<GeneratingIndicatorProps> = (props) => {
  const [ellipsisIndex, setEllipsisIndex] = createSignal(0);

  createEffect(() => {
    if (!props.isActive) {
      setEllipsisIndex(0);
      return;
    }

    const ellipsisInterval = setInterval(() => {
      setEllipsisIndex((value) => (value + 1) % 4);
    }, 180);

    onCleanup(() => clearInterval(ellipsisInterval));
  });

  return (
    <div class="text-[14px] leading-[18px] shrink-0 text-[color(display-p3_0.466_0.466_0.466)] font-sans size-fit">
      Generating
      <span class="inline-block w-[3ch] tabular-nums text-left">
        {[".", "..", "...", ""][ellipsisIndex()]}
      </span>
    </div>
  );
};

interface TagBadgeProps {
  tagName: string;
  isClickable: boolean;
  onClick: (event: MouseEvent) => void;
  onHoverChange?: (hovered: boolean) => void;
  shrink?: boolean;
  forceShowIcon?: boolean;
}

interface ClickToCopyPillProps {
  onClick: () => void;
  asButton?: boolean;
  dimmed?: boolean;
  shrink?: boolean;
  hasAgent?: boolean;
  isEditing?: boolean;
}

interface BottomSectionProps {
  children: JSX.Element;
}

interface LabelPosition {
  left: number;
  top: number;
  arrowLeft: number;
}

type ArrowPosition = "bottom" | "top";

const ARROW_HEIGHT = 8;
const LABEL_GAP = 4;
const IDLE_TIMEOUT_MS = 400;
const CURSOR_POSITION_GAP_X_PX = 10;
const CURSOR_POSITION_GAP_Y_PX = 10;

const TagBadge: Component<TagBadgeProps> = (props) => {
  const [isHovered, setIsHovered] = createSignal(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    props.onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    props.onHoverChange?.(false);
  };

  return (
    <div
      class={cn(
        "contain-layout flex items-center px-[3px] py-0 h-4 rounded-sm gap-0.5 [border-width:0.5px] border-solid border-black bg-black",
        props.shrink && "shrink-0 w-fit",
        props.isClickable && "cursor-pointer",
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={props.onClick}
    >
      <span
        class={cn(
          "text-white text-[12.5px] leading-3.5 shrink-0 w-fit h-fit font-medium",
        )}
      >
        {props.tagName}
      </span>
      <Show when={props.isClickable || props.forceShowIcon}>
        <IconOpen
          size={10}
          class={cn(
            "text-white transition-all duration-100",
            isHovered() || props.forceShowIcon
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75 -ml-[2px] w-0",
          )}
        />
      </Show>
    </div>
  );
};

interface ArrowProps {
  position: ArrowPosition;
  leftPx: number;
  color?: string;
}

const Arrow: Component<ArrowProps> = (props) => {
  const arrowColor = () => props.color ?? "white";

  return (
    <div
      class="absolute w-0 h-0"
      style={{
        left: `${props.leftPx}px`,
        ...(props.position === "bottom"
          ? { top: "0", transform: "translateX(-50%) translateY(-100%)" }
          : { bottom: "0", transform: "translateX(-50%) translateY(100%)" }),
        "border-left": "8px solid transparent",
        "border-right": "8px solid transparent",
        ...(props.position === "bottom"
          ? { "border-bottom": `8px solid ${arrowColor()}` }
          : { "border-top": `8px solid ${arrowColor()}` }),
      }}
    />
  );
};

const ClickToCopyPill: Component<ClickToCopyPillProps> = (props) => {
  const labelPrefix = () => {
    if (props.hasAgent) {
      if (props.isEditing) return null;
      return "Right click to ";
    }
    return "Click to ";
  };

  const labelAction = () => {
    if (props.hasAgent) {
      if (props.isEditing) return "Editing";
      return "Edit";
    }
    return "Copy";
  };

  return (
    <div
      class={cn(
        "contain-layout shrink-0 flex items-center px-0 py-px w-fit h-[18px] rounded-sm gap-[3px]",
        props.asButton && "cursor-pointer",
        props.dimmed && "opacity-50 hover:opacity-100 transition-opacity",
      )}
      role="button"
      onClick={props.onClick}
    >
      <div class="text-[13px] leading-4 shrink-0 font-sans font-medium w-fit h-fit">
        <Show when={labelPrefix()}>
          <span class="text-black/50">{labelPrefix()}</span>
        </Show>
        <span class="text-black">{labelAction()}</span>
      </div>
    </div>
  );
};

const BOTTOM_SECTION_GRADIENT =
  "linear-gradient(in oklab 180deg, oklab(100% 0 0) 0%, oklab(96.1% 0 0) 5.92%)";

const BottomSection: Component<BottomSectionProps> = (props) => (
  <div
    class="[font-synthesis:none] contain-layout shrink-0 flex flex-col items-start px-2 py-[5px] w-auto h-fit self-stretch [border-top-width:0.5px] border-t-solid border-t-[#D9D9D9] antialiased rounded-t-none rounded-b-sm -mt-px"
    style={{ "background-image": BOTTOM_SECTION_GRADIENT }}
  >
    {props.children}
  </div>
);

let activeConfirmationId: symbol | null = null;

interface DismissConfirmationProps {
  onConfirm?: () => void;
  onCancel?: () => void;
}

const DismissConfirmation: Component<DismissConfirmationProps> = (props) => {
  const instanceId = Symbol();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (activeConfirmationId !== instanceId) return;
    if (isKeyboardEventTriggeredByInput(event)) return;
    if (event.code === "Enter" || event.code === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      props.onConfirm?.();
    }
  };

  const handleFocus = () => {
    activeConfirmationId = instanceId;
  };

  onMount(() => {
    activeConfirmationId = instanceId;
    window.addEventListener("keydown", handleKeyDown, { capture: true });
  });

  onCleanup(() => {
    if (activeConfirmationId === instanceId) {
      activeConfirmationId = null;
    }
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
  });

  return (
    <div
      class="contain-layout shrink-0 flex flex-col justify-center items-end gap-1 w-fit h-fit"
      onPointerDown={handleFocus}
      onClick={handleFocus}
    >
      <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 px-1.5 w-full h-fit">
        <span class="text-black text-[13px] leading-4 shrink-0 font-sans font-medium w-fit h-fit">
          Discard?
        </span>
      </div>
      <BottomSection>
        <div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit">
          <button
            class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] h-[17px]"
            onClick={props.onCancel}
          >
            <span class="text-black text-[13px] leading-3.5 font-sans font-medium">
              No
            </span>
          </button>
          <button
            class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#7e0002] cursor-pointer transition-all hover:bg-[#FEF2F2] h-[17px]"
            onClick={props.onConfirm}
          >
            <span class="text-[#B91C1C] text-[13px] leading-3.5 font-sans font-medium">
              Yes
            </span>
            <IconReturn size={10} class="text-[#c00002]" />
          </button>
        </div>
      </BottomSection>
    </div>
  );
};

interface ErrorConfirmationProps {
  error: string;
  onAcknowledge?: () => void;
  onRetry?: () => void;
}

const MAX_ERROR_LENGTH = 50;

const ErrorConfirmation: Component<ErrorConfirmationProps> = (props) => {
  const instanceId = Symbol();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (activeConfirmationId !== instanceId) return;
    if (isKeyboardEventTriggeredByInput(event)) return;
    if (event.code === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      props.onRetry?.();
    } else if (event.code === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      props.onAcknowledge?.();
    }
  };

  const handleFocus = () => {
    activeConfirmationId = instanceId;
  };

  const truncatedError = () => {
    const error = props.error;
    if (error.length <= MAX_ERROR_LENGTH) return error;
    return `${error.slice(0, MAX_ERROR_LENGTH)}…`;
  };

  onMount(() => {
    activeConfirmationId = instanceId;
    window.addEventListener("keydown", handleKeyDown, { capture: true });
  });

  onCleanup(() => {
    if (activeConfirmationId === instanceId) {
      activeConfirmationId = null;
    }
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
  });

  return (
    <div
      class="contain-layout shrink-0 flex flex-col justify-center items-end gap-1 w-fit h-fit max-w-[280px]"
      onPointerDown={handleFocus}
      onClick={handleFocus}
    >
      <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 px-1.5 w-full h-fit">
        <span
          class="text-[#B91C1C] text-[13px] leading-4 font-sans font-medium"
          title={props.error}
        >
          {truncatedError()}
        </span>
      </div>
      <BottomSection>
        <div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit">
          <button
            class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] h-[17px]"
            onClick={props.onRetry}
          >
            <span class="text-black text-[13px] leading-3.5 font-sans font-medium">
              Retry
            </span>
            <IconRetry size={10} class="text-black/50" />
          </button>
          <button
            class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] h-[17px]"
            onClick={props.onAcknowledge}
          >
            <span class="text-black text-[13px] leading-3.5 font-sans font-medium">
              Ok
            </span>
          </button>
        </div>
      </BottomSection>
    </div>
  );
};

interface CompletedConfirmationProps {
  statusText: string;
  supportsUndo?: boolean;
  supportsFollowUp?: boolean;
  dismissButtonText?: string;
  previousPrompt?: string;
  onDismiss?: () => void;
  onUndo?: () => void;
  onFollowUpSubmit?: (prompt: string) => void;
  onCopyStateChange?: () => void;
}

const CompletedConfirmation: Component<CompletedConfirmationProps> = (
  props,
) => {
  const instanceId = Symbol();
  let inputRef: HTMLTextAreaElement | undefined;
  const [didCopy, setDidCopy] = createSignal(false);
  const [displayStatusText, setDisplayStatusText] = createSignal(
    props.statusText,
  );
  const [followUpInput, setFollowUpInput] = createSignal("");

  const handleDismiss = () => {
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
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (event.code === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleFollowUpSubmit();
    } else if (event.code === "Escape") {
      event.preventDefault();
      handleDismiss();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (activeConfirmationId !== instanceId) return;
    if (isKeyboardEventTriggeredByInput(event)) return;
    if (event.code === "Enter" || event.code === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      handleDismiss();
    } else if (
      event.code === "KeyZ" &&
      (event.metaKey || event.ctrlKey) &&
      props.supportsUndo &&
      props.onUndo
    ) {
      event.preventDefault();
      event.stopPropagation();
      props.onUndo();
    }
  };

  const handleFocus = () => {
    activeConfirmationId = instanceId;
  };

  createEffect(() => {
    if (!didCopy()) {
      setDisplayStatusText(props.statusText);
    }
  });

  onMount(() => {
    activeConfirmationId = instanceId;
    window.addEventListener("keydown", handleKeyDown, { capture: true });
  });

  onCleanup(() => {
    if (activeConfirmationId === instanceId) {
      activeConfirmationId = null;
    }
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
                  Reject
                </span>
              </button>
            </Show>
            <Show when={props.onDismiss}>
              <button
                class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] h-[17px]"
                onClick={handleDismiss}
                disabled={didCopy()}
              >
                <span class="text-black text-[13px] leading-3.5 font-sans font-medium">
                  {props.dismissButtonText ?? "Ok"}
                </span>
                <Show when={!didCopy()}>
                  <IconReturn size={10} class="text-black/50" />
                </Show>
              </button>
            </Show>
          </div>
        </div>
      </Show>
      <Show when={didCopy()}>
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

export const SelectionLabel: Component<SelectionLabelProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let inputRef: HTMLTextAreaElement | undefined;
  let promptPlaceholderMeasureRef: HTMLSpanElement | undefined;
  let isTagCurrentlyHovered = false;
  let lastValidPosition: LabelPosition | null = null;
  let lastElementIdentity: string | null = null;

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [arrowPosition, setArrowPosition] =
    createSignal<ArrowPosition>("bottom");
  const [viewportVersion, setViewportVersion] = createSignal(0);
  const [isIdle, setIsIdle] = createSignal(false);
  const [isPromptMultiline, setIsPromptMultiline] = createSignal(false);
  const [promptMinWidthPx, setPromptMinWidthPx] = createSignal<number | null>(
    null,
  );
  const [hadValidBounds, setHadValidBounds] = createSignal(false);
  const [lockedCopyingPosition, setLockedCopyingPosition] =
    createSignal<LabelPosition | null>(null);

  const isNotProcessing = () =>
    props.status !== "copying" &&
    props.status !== "copied" &&
    props.status !== "fading";

  const isCollapsedBaseLabel = () =>
    isNotProcessing() && !props.isInputExpanded && !props.isPendingDismiss;

  const shouldShowCollapsedSelectionUi = () => isCollapsedBaseLabel() && !props.error;
  const shouldShowExpandedSelectionUi = () =>
    isNotProcessing() && Boolean(props.isInputExpanded) && !props.isPendingDismiss && !props.error;

  const isPositionedNearCursor = () =>
    props.mouseX !== undefined && props.mouseY !== undefined;

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
      !props.isInputExpanded &&
      isNotProcessing()
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
    void props.statusText;
    void props.inputValue;
    void props.hasAgent;
    void props.isInputExpanded;
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
    if (props.status === "copying") {
      if (!lockedCopyingPosition() && lastValidPosition) {
        setLockedCopyingPosition(lastValidPosition);
      }
      return;
    }

    if (lockedCopyingPosition()) {
      setLockedCopyingPosition(null);
    }
  });

  createEffect(() => {
    if (props.isInputExpanded && inputRef) {
      requestAnimationFrame(() => inputRef?.focus());
    }
  });

  const computedPosition = () => {
    if (props.status === "copying") {
      const lockedPosition = lockedCopyingPosition();
      if (lockedPosition) return lockedPosition;
      if (lastValidPosition) return lastValidPosition;
    }

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
    const selectionCenterY = bounds.y + bounds.height / 2;
    const cursorX = props.mouseX ?? selectionCenterX;
    const cursorY = props.mouseY ?? selectionCenterY;
    const selectionBottom = bounds.y + bounds.height;
    const selectionTop = bounds.y;

    if (isPositionedNearCursor()) {
      const desiredLeftRight = cursorX + CURSOR_POSITION_GAP_X_PX;
      const desiredLeftLeft = cursorX - labelWidth - CURSOR_POSITION_GAP_X_PX;

      let positionLeft = desiredLeftRight;
      if (positionLeft + labelWidth > viewportWidth - VIEWPORT_MARGIN_PX) {
        positionLeft = desiredLeftLeft;
      }

      positionLeft = Math.min(
        viewportWidth - labelWidth - VIEWPORT_MARGIN_PX,
        Math.max(VIEWPORT_MARGIN_PX, positionLeft),
      );

      const desiredTopBottom = cursorY + CURSOR_POSITION_GAP_Y_PX;
      const desiredTopTop = cursorY - labelHeight - CURSOR_POSITION_GAP_Y_PX;

      let positionTop = desiredTopBottom;
      if (positionTop + labelHeight > viewportHeight - VIEWPORT_MARGIN_PX) {
        positionTop = desiredTopTop;
      }

      positionTop = Math.min(
        viewportHeight - labelHeight - VIEWPORT_MARGIN_PX,
        Math.max(VIEWPORT_MARGIN_PX, positionTop),
      );

      const position = { left: positionLeft, top: positionTop, arrowLeft: 0 };
      lastValidPosition = position;
      setHadValidBounds(true);
      return position;
    }

    let positionLeft = cursorX - labelWidth / 2;
    const verticalOffset = ARROW_HEIGHT + LABEL_GAP;
    let positionTop = selectionBottom + verticalOffset;

    if (positionLeft + labelWidth > viewportWidth - VIEWPORT_MARGIN_PX) {
      positionLeft = viewportWidth - labelWidth - VIEWPORT_MARGIN_PX;
    }
    if (positionLeft < VIEWPORT_MARGIN_PX) {
      positionLeft = VIEWPORT_MARGIN_PX;
    }

    const totalHeightNeeded = labelHeight + verticalOffset;
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

  const resizePromptInputToContent = (element?: HTMLTextAreaElement) => {
    if (!element) return;
    // Auto-grow textarea to fit wrapped content without scrollbars.
    element.style.height = "auto";
    const scrollHeight = element.scrollHeight;
    element.style.height = `${scrollHeight}px`;

    const computedLineHeight = Number.parseFloat(
      window.getComputedStyle(element).lineHeight || "0",
    );
    if (!Number.isFinite(computedLineHeight) || computedLineHeight <= 0) {
      setIsPromptMultiline(false);
      return;
    }

    const estimatedLineCount = Math.ceil((scrollHeight - 0.5) / computedLineHeight);
    setIsPromptMultiline(estimatedLineCount > 1);
  };

  const measurePromptPlaceholderWidth = () => {
    if (!promptPlaceholderMeasureRef) return;
    const measured = promptPlaceholderMeasureRef.getBoundingClientRect().width;
    if (!Number.isFinite(measured) || measured <= 0) return;
    // A tiny buffer helps avoid subpixel rounding causing a 1px "snap".
    setPromptMinWidthPx(Math.ceil(measured) + 1);
  };

  const handleInput = (event: InputEvent) => {
    const target = event.target as HTMLTextAreaElement;
    props.onInputChange?.(target.value);
    requestAnimationFrame(() => resizePromptInputToContent(target));
  };

  const tagDisplay = () => {
    if (props.componentName && props.tagName) {
      return `${props.componentName}.${props.tagName}`;
    }
    return props.componentName || props.tagName || "element";
  };

  const promptPlaceholder = () => `edit ${tagDisplay()}`;

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
      isNotProcessing() && props.isInputExpanded && !props.isPendingDismiss;
    if (isEditableInputVisible && inputRef) {
      inputRef.focus();
    }
  };

  const handleSubmit = () => {
    props.onSubmit?.();
  };

  const hasInputValue = () => (props.inputValue?.length ?? 0) > 0;
  const triggerCancelOrAbort = () => {
    if (props.onCancel) return props.onCancel();
    if (props.onAbort) return props.onAbort();
  };

  createEffect(() => {
    void props.inputValue;
    void props.componentName;
    void props.tagName;
    requestAnimationFrame(() => {
      measurePromptPlaceholderWidth();
      resizePromptInputToContent(inputRef);
    });
  });

  createEffect(() => {
    if (props.status !== "copying") return;
    if (props.isPendingAbort) return;
    if (props.error) return;
    if (!props.onCancel && !props.onAbort) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isKeyboardEventTriggeredByInput(event)) return;
      if (event.code !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      triggerCancelOrAbort();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown, true));
  });

  const shouldShowWithoutBounds = () =>
    hadValidBounds() &&
    (props.status === "copied" || props.status === "fading");

  return (
    <Show
      when={
        props.visible !== false &&
        (props.selectionBounds || shouldShowWithoutBounds())
      }
    >
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        class="fixed font-sans text-[13px] antialiased transition-opacity duration-300 ease-out select-none"
        style={{
          top: `${computedPosition().top}px`,
          left: `${computedPosition().left}px`,
          "z-index": "2147483647",
          "pointer-events":
            props.isInputExpanded ||
            (props.status === "copied" && props.onDismiss) ||
            (props.status === "copying" && (props.onAbort || props.onCancel))
              ? "auto"
              : "none",
          opacity: props.status === "fading" ? 0 : 1,
        }}
        onPointerDown={handleContainerPointerDown}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      >
        <Show when={!shouldShowCollapsedSelectionUi() && !isPositionedNearCursor()}>
          <Arrow
            position={arrowPosition()}
            leftPx={computedPosition().arrowLeft}
          />
        </Show>

        <Show
          when={
            (props.status === "copied" || props.status === "fading") &&
            !props.error
          }
        >
          <CompletedConfirmation
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
          />
        </Show>

        <Show when={shouldShowCollapsedSelectionUi()}>
          <div class="[font-synthesis:none] contain-layout flex flex-col justify-center items-start pt-[5px] pb-[5px] pl-1.5 pr-[9px] rounded-tl-none rounded-bl-md gap-1.5 bg-[color(display-p3_0_0_0)] [border-width:0.75px] border-solid border-[color(display-p3_0.307_0.307_0.307)] antialiased size-fit rounded-r-md">
            <div class="contain-layout flex items-center gap-1 shrink-0 size-fit">
              <div class="contain-layout flex flex-col justify-center items-center px-1.5 py-px w-fit h-[21px] rounded-[3px] shrink-0 bg-[color(display-p3_0.122_0.122_0.122)]">
                <div class="text-[14px] leading-[18px] shrink-0 text-[color(display-p3_1_1_1)] font-[ui-monospace,'SFMono-Regular','SF_Mono','Menlo','Consolas','Liberation_Mono',monospace] size-fit">
                  {tagDisplay()}
                </div>
              </div>
            </div>
            <div class="contain-layout shrink-0 flex items-center pl-0 gap-[7px] size-fit">
              <div class="contain-layout shrink-0 flex items-center gap-2 pl-1 size-fit">
                <div class="text-[14px] leading-[18px] shrink-0 text-[color(display-p3_1_1_1)] font-sans size-fit">
                  Edit
                </div>
                <div class="contain-layout shrink-0 flex items-center gap-0.5 size-fit">
                  <div class="contain-layout shrink-0 flex items-center gap-0.5 pl-0 size-fit">
                    <div class="text-[14px] leading-[18px] shrink-0 text-[color(display-p3_0.687_0.687_0.687)] font-sans size-fit">
                      [Right click]
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Show>

        <Show when={shouldShowExpandedSelectionUi()}>
          <div class="[font-synthesis:none] contain-layout flex flex-col justify-center items-start pt-[5px] pb-[5px] pl-1.5 pr-[9px] rounded-tl-none rounded-bl-md gap-1.5 bg-[color(display-p3_0_0_0)] [border-width:0.75px] border-solid border-[color(display-p3_0.307_0.307_0.307)] antialiased size-fit rounded-r-md">
            <div class="contain-layout flex items-center gap-1 shrink-0 size-fit">
              <div class="contain-layout flex flex-col justify-center items-center px-1.5 py-px w-fit h-[21px] rounded-[3px] shrink-0 bg-[color(display-p3_0.122_0.122_0.122)]">
                <div class="text-[14px] leading-[18px] shrink-0 text-[color(display-p3_1_1_1)] font-[ui-monospace,'SFMono-Regular','SF_Mono','Menlo','Consolas','Liberation_Mono',monospace] size-fit">
                  {tagDisplay()}
                </div>
              </div>
            </div>

            <div class="contain-layout shrink-0 flex items-start pl-2 gap-[7px] size-fit">
              <div class="text-[14px] leading-[18px] shrink-0 text-[color(display-p3_0.440_0.440_0.440)] font-[ui-monospace,'SFMono-Regular','SF_Mono','Menlo','Consolas','Liberation_Mono',monospace] size-fit">
                └
              </div>
              <div class="contain-layout shrink-0 relative flex items-start gap-1 pl-0 size-fit">
                <span
                  ref={promptPlaceholderMeasureRef}
                  class="absolute left-0 top-0 -z-10 opacity-0 pointer-events-none text-[14px] leading-[18px] font-sans whitespace-pre"
                >
                  {promptPlaceholder()}
                </span>
                <textarea
                  ref={(element) => {
                    inputRef = element;
                    if (props.isInputExpanded) {
                      requestAnimationFrame(() => {
                        measurePromptPlaceholderWidth();
                        resizePromptInputToContent(element);
                        element.focus();
                      });
                    }
                  }}
                  data-react-grab-ignore-events
                  class="text-[14px] leading-[18px] shrink-0 text-[color(display-p3_1_1_1)] placeholder:text-[color(display-p3_0.466_0.466_0.466)] placeholder:opacity-100 caret-[color(display-p3_1_1_1)] font-sans bg-transparent border-none outline-none resize-none p-0 m-0 overflow-hidden whitespace-pre-wrap break-words w-fit max-w-[170px]"
                  style={{
                    "field-sizing": "content",
                    ...(promptMinWidthPx()
                      ? { "min-width": `${promptMinWidthPx()}px` }
                      : {}),
                  }}
                  value={props.inputValue ?? ""}
                  onInput={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder={promptPlaceholder()}
                  rows={1}
                />
                <button
                  data-react-grab-ignore-events
                  class={cn(
                    "shrink-0 cursor-pointer transition-opacity",
                    isPromptMultiline() ? "self-end" : "self-center",
                    hasInputValue() ? "opacity-100" : "opacity-47",
                  )}
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleSubmit();
                  }}
                >
                  <IconReturn
                    size={11}
                    class={cn(
                      hasInputValue()
                        ? "text-[color(display-p3_0.466_0.466_0.466)]"
                        : "text-[color(display-p3_0.307_0.307_0.307)]",
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        </Show>

        <Show when={props.status === "copying" && !props.isPendingAbort && !props.error}>
          <div class="[font-synthesis:none] contain-layout flex flex-col justify-center items-start pt-[5px] pb-[5px] pl-1.5 pr-[9px] rounded-tl-none rounded-bl-md gap-1.5 bg-[color(display-p3_0_0_0)] [border-width:0.75px] border-solid border-[color(display-p3_0.307_0.307_0.307)] antialiased size-fit rounded-r-md">
            <div class="contain-layout flex items-center gap-1 shrink-0 size-fit">
              <div class="contain-layout flex flex-col justify-center items-center px-1.5 py-px w-fit h-[21px] rounded-[3px] shrink-0 bg-[color(display-p3_0.122_0.122_0.122)]">
                <div class="text-[14px] leading-[18px] shrink-0 text-[color(display-p3_1_1_1)] font-[ui-monospace,'SFMono-Regular','SF_Mono','Menlo','Consolas','Liberation_Mono',monospace] size-fit">
                  {tagDisplay()}
                </div>
              </div>
            </div>

            <div class="contain-layout shrink-0 flex items-center pl-2 gap-[16px] size-fit">
              <div class="contain-layout shrink-0 flex items-center gap-[7px] size-fit">
                <div class="text-[14px] leading-[18px] shrink-0 text-[color(display-p3_0.440_0.440_0.440)] font-[ui-monospace,'SFMono-Regular','SF_Mono','Menlo','Consolas','Liberation_Mono',monospace] size-fit">
                  └
                </div>
                <div class="contain-layout shrink-0 flex items-center gap-2 pl-0 size-fit">
                  <GeneratingIndicator isActive={true} />
                </div>
              </div>

              <div class="contain-layout shrink-0 flex items-center gap-2 pl-0 size-fit">
                <div class="contain-layout shrink-0 flex items-center gap-2 pl-0 size-fit">
                  <button
                    data-react-grab-ignore-events
                    class="contain-layout shrink-0 flex items-center gap-0.5 size-fit cursor-pointer"
                    onPointerDown={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      triggerCancelOrAbort();
                    }}
                  >
                    <div class="text-[14px] leading-[18px] shrink-0 text-[color(display-p3_1_1_1)] font-sans size-fit">
                      Cancel
                    </div>
                    <div class="text-[14px] leading-[18px] shrink-0 text-[color(display-p3_0.466_0.466_0.466)] font-sans size-fit">
                      [Esc]
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Show>

        <div
          class="[font-synthesis:none] contain-layout flex items-center gap-[5px] rounded-sm bg-white antialiased w-fit h-fit p-0"
          style={{
            display:
              (props.status === "copied" || props.status === "fading") &&
              !props.error
                ? "none"
                : shouldShowCollapsedSelectionUi()
                  ? "none"
                  : shouldShowExpandedSelectionUi()
                    ? "none"
                    : props.status === "copying"
                      ? "none"
                : undefined,
          }}
        >
          <Show when={props.status === "copying" && !props.isPendingAbort}>
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit max-w-[280px]">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 px-1.5 w-auto h-fit">
                <div class="contain-layout flex items-center px-0 py-px w-auto h-fit rounded-sm gap-[3px]">
                  <span class="text-[13px] leading-4 font-sans font-medium w-auto h-fit whitespace-normal text-[#71717a] animate-pulse tabular-nums">
                    {props.statusText ?? "Grabbing…"}
                  </span>
                </div>
              </div>
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
            </div>
          </Show>

          <Show when={props.status === "copying" && props.isPendingAbort}>
            <DismissConfirmation
              onConfirm={props.onConfirmAbort}
              onCancel={props.onCancelAbort}
            />
          </Show>

          <Show
            when={
              isNotProcessing() &&
              props.isInputExpanded &&
              !props.isPendingDismiss
            }
          >
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit max-w-[280px]">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 w-fit h-fit pl-1.5 pr-1">
                <ClickToCopyPill
                  onClick={handleSubmit}
                  dimmed
                  shrink
                  hasAgent={props.hasAgent}
                  isEditing
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
            <DismissConfirmation
              onConfirm={props.onConfirmDismiss}
              onCancel={props.onCancelDismiss}
            />
          </Show>

          <Show when={props.error}>
            <ErrorConfirmation
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
