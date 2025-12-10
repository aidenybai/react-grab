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
import { VIEWPORT_MARGIN_PX } from "../constants.js";
import { cn } from "../utils/cn.js";
import { useSpeechRecognition } from "../utils/speech-recognition.js";
import { IconOpen } from "./icon-open.js";
import { IconMic } from "./icon-mic.js";
import { IconReturn } from "./icon-return.js";

interface SelectionLabelProps {
  tagName?: string;
  componentName?: string;
  selectionBounds?: OverlayBounds;
  mouseX?: number;
  visible?: boolean;
  isInputExpanded?: boolean;
  inputValue?: string;
  hasAgent?: boolean;
  isAgentConnected?: boolean;
  status?: SelectionLabelStatus;
  statusText?: string;
  filePath?: string;
  lineNumber?: number;
  onInputChange?: (value: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  onToggleExpand?: () => void;
  onAbort?: () => void;
  onOpen?: () => void;
  onDismiss?: () => void;
  onUndo?: () => void;
  isPendingDismiss?: boolean;
  onConfirmDismiss?: () => void;
  onCancelDismiss?: () => void;
  error?: string;
  onAcknowledgeError?: () => void;
}

interface TagBadgeProps {
  tagName: string;
  isClickable: boolean;
  onClick: (event: MouseEvent) => void;
  onHoverChange?: (hovered: boolean) => void;
  showMono?: boolean;
  shrink?: boolean;
  forceShowIcon?: boolean;
}

interface ClickToCopyPillProps {
  onClick: () => void;
  asButton?: boolean;
  dimmed?: boolean;
  shrink?: boolean;
  hasParent?: boolean;
  hasAgent?: boolean;
}

interface BottomSectionProps {
  children: JSX.Element;
}

type ArrowPosition = "bottom" | "top";

const ARROW_HEIGHT = 8;
const LABEL_GAP = 4;
const IDLE_TIMEOUT_MS = 400;

const TAG_GRADIENT =
  "linear-gradient(in oklab 180deg, oklab(88.7% 0.086 -0.058) 0%, oklab(83.2% 0.132 -0.089) 100%)";

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
        "contain-layout flex items-center px-[3px] py-0 h-4 rounded-[1px] gap-0.5 [border-width:0.5px] border-solid border-label-tag-border",
        props.shrink && "shrink-0 w-fit",
        props.isClickable && "cursor-pointer",
      )}
      style={{ "background-image": TAG_GRADIENT }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={props.onClick}
    >
      <span
        class={cn(
          "text-[#47004A] text-[11.5px] leading-3.5 shrink-0 w-fit h-fit",
          props.showMono
            ? "tracking-[-0.08em] font-[ui-monospace,'SFMono-Regular','SF_Mono','Menlo','Consolas','Liberation_Mono',monospace]"
            : "tracking-[-0.04em] font-medium",
        )}
      >
        {props.tagName}
      </span>
      <Show when={props.isClickable || props.forceShowIcon}>
        <IconOpen
          size={10}
          class={cn(
            "text-label-tag-border transition-all duration-100",
            isHovered() || props.forceShowIcon
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75 -ml-[2px] w-0",
          )}
        />
      </Show>
    </div>
  );
};

const ParentBadge: Component<{ name: string }> = (props) => (
  <div class="contain-layout shrink-0 flex items-center w-fit h-4 rounded-[1px] gap-1 px-[3px] [border-width:0.5px] border-solid border-[#B3B3B3] py-0 bg-[#F7F7F7]">
    <span class="text-[#0C0C0C] text-[11.5px] leading-3.5 shrink-0 tracking-[-0.08em] font-[ui-monospace,'SFMono-Regular','SF_Mono','Menlo','Consolas','Liberation_Mono',monospace] w-fit h-fit">
      {props.name}
    </span>
  </div>
);

const ChevronSeparator: Component = () => (
  <div class="contain-layout shrink-0 flex items-center w-fit h-4 rounded-[1px] gap-1 px-[3px] [border-width:0.5px] border-solid border-white py-0">
    <span class="text-[#0C0C0C] text-[11.5px] leading-3.5 shrink-0 tracking-[-0.08em] font-[ui-monospace,'SFMono-Regular','SF_Mono','Menlo','Consolas','Liberation_Mono',monospace] w-fit h-fit">
      &gt;
    </span>
  </div>
);

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
  const labelText = () => {
    if (props.hasAgent) return "Selecting";
    if (props.hasParent) return "Copy";
    return "Click to copy";
  };

  return (
    <div
      class={cn(
        "contain-layout shrink-0 flex items-center px-0 py-px w-fit h-[18px] rounded-[1.5px] gap-[3px]",
        props.asButton && "cursor-pointer",
        props.dimmed && "opacity-50 hover:opacity-100 transition-opacity",
      )}
      role="button"
      onClick={props.onClick}
    >
      <div class="text-black text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-sans font-medium w-fit h-fit">
        {labelText()}
      </div>
    </div>
  );
};

const BOTTOM_SECTION_GRADIENT =
  "linear-gradient(in oklab 180deg, oklab(100% 0 0) 0%, oklab(96.1% 0 0) 5.92%)";

const BottomSection: Component<BottomSectionProps> = (props) => (
  <div
    class="[font-synthesis:none] contain-layout shrink-0 flex flex-col items-start px-2 py-[5px] w-auto h-fit self-stretch [border-top-width:0.5px] border-t-solid border-t-[#D9D9D9] antialiased rounded-t-none rounded-b-xs -mt-px"
    style={{ "background-image": BOTTOM_SECTION_GRADIENT }}
  >
    {props.children}
  </div>
);

interface DismissConfirmationProps {
  onConfirm?: () => void;
  onCancel?: () => void;
}

const DismissConfirmation: Component<DismissConfirmationProps> = (props) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.code === "Enter" || event.code === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      props.onConfirm?.();
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown, { capture: true });
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
  });

  return (
    <div class="contain-layout shrink-0 flex flex-col justify-center items-end gap-1 w-fit h-fit">
      <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 px-1.5 w-full h-fit">
        <span class="text-black text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-sans font-medium w-fit h-fit">
          Discard prompt?
        </span>
      </div>
      <BottomSection>
        <div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit">
          <button
            class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-xs bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] h-[17px]"
            onClick={props.onCancel}
          >
            <span class="text-black text-[11px] leading-3.5 tracking-[-0.04em] font-sans font-medium">
              No
            </span>
          </button>
          <button
            class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-xs bg-white [border-width:0.5px] border-solid border-[#7e0002] cursor-pointer transition-all hover:bg-[#FEF2F2] h-[17px]"
            onClick={props.onConfirm}
          >
            <span class="text-[#B91C1C] text-[11px] leading-3.5 tracking-[-0.04em] font-sans font-medium">
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
}

const MAX_ERROR_LENGTH = 50;

const ErrorConfirmation: Component<ErrorConfirmationProps> = (props) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.code === "Enter" || event.code === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      props.onAcknowledge?.();
    }
  };

  const truncatedError = () => {
    const error = props.error;
    if (error.length <= MAX_ERROR_LENGTH) return error;
    return `${error.slice(0, MAX_ERROR_LENGTH)}…`;
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown, { capture: true });
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
  });

  return (
    <div class="contain-layout shrink-0 flex flex-col justify-center items-end gap-1 w-fit h-fit max-w-[280px]">
      <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 px-1.5 w-full h-fit">
        <span
          class="text-[#B91C1C] text-[12px] leading-4 tracking-[-0.04em] font-sans font-medium"
          title={props.error}
        >
          {truncatedError()}
        </span>
      </div>
      <BottomSection>
        <div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit">
          <button
            class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-xs bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] h-[17px]"
            onClick={props.onAcknowledge}
          >
            <span class="text-black text-[11px] leading-3.5 tracking-[-0.04em] font-sans font-medium">
              Ok
            </span>
            <IconReturn size={10} class="text-black/50" />
          </button>
        </div>
      </BottomSection>
    </div>
  );
};

interface CompletedConfirmationProps {
  statusText: string;
  onDismiss?: () => void;
  onUndo?: () => void;
}

const CompletedConfirmation: Component<CompletedConfirmationProps> = (props) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.code === "Enter" || event.code === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      props.onDismiss?.();
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown, { capture: true });
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
  });

  return (
    <div class="[font-synthesis:none] contain-layout shrink-0 flex flex-col justify-center items-end rounded-xs bg-white antialiased w-fit h-fit">
      <div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 px-1.5 w-full h-fit">
        <span class="text-black text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-sans font-medium w-fit h-fit tabular-nums">
          {props.statusText}
        </span>
      </div>
      <Show when={props.onDismiss || props.onUndo}>
        <BottomSection>
          <div class="contain-layout shrink-0 flex items-center justify-end gap-[5px] w-full h-fit">
            <Show when={props.onUndo}>
              <button
                class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-xs bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] h-[17px]"
                onClick={() => props.onUndo?.()}
              >
                <span class="text-black text-[11px] leading-3.5 tracking-[-0.04em] font-sans font-medium">
                  Undo
                </span>
              </button>
            </Show>
            <Show when={props.onDismiss}>
              <button
                class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-xs bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] h-[17px]"
                onClick={() => props.onDismiss?.()}
              >
                <span class="text-black text-[11px] leading-3.5 tracking-[-0.04em] font-sans font-medium">
                  Ok
                </span>
                <IconReturn size={10} class="text-black/50" />
              </button>
            </Show>
          </div>
        </BottomSection>
      </Show>
    </div>
  );
};

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

  const speechRecognition = useSpeechRecognition({
    onTranscript: (transcript) => props.onInputChange?.(transcript),
    getCurrentValue: () => props.inputValue ?? "",
  });

  const isNotProcessing = () =>
    props.status !== "copying" &&
    props.status !== "copied" &&
    props.status !== "fading";

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
    if (event.code === "Enter" && isNotProcessing()) {
      if (props.isInputExpanded) {
        const isInputFocused = document.activeElement === inputRef;
        if (!isInputFocused) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          speechRecognition.stop();
          props.onCancel?.();
        }
      } else if (isIdle()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        props.onToggleExpand?.();
      }
    } else if (event.code === "Escape" && isNotProcessing() && props.isInputExpanded) {
      const isInputFocused = document.activeElement === inputRef;
      if (!isInputFocused) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        speechRecognition.stop();
        props.onCancel?.();
      }
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
    if (props.isInputExpanded && inputRef) {
      setTimeout(() => {
        inputRef?.focus();
      }, 0);
    } else {
      speechRecognition.stop();
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
    let positionTop = selectionBottom + ARROW_HEIGHT + LABEL_GAP;

    if (positionLeft + labelWidth > viewportWidth - VIEWPORT_MARGIN_PX) {
      positionLeft = viewportWidth - labelWidth - VIEWPORT_MARGIN_PX;
    }
    if (positionLeft < VIEWPORT_MARGIN_PX) {
      positionLeft = VIEWPORT_MARGIN_PX;
    }

    const totalHeightNeeded = labelHeight + ARROW_HEIGHT + LABEL_GAP;
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
      if (!props.inputValue?.trim()) return;
      speechRecognition.stop();
      props.onSubmit?.();
    } else if (event.code === "Escape") {
      event.preventDefault();
      speechRecognition.stop();
      props.onCancel?.();
    }
  };

  const handleInput = (event: InputEvent) => {
    const target = event.target as HTMLTextAreaElement;
    props.onInputChange?.(target.value);
  };

  const tagDisplay = () => props.tagName || "element";

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
    if (props.isInputExpanded && !props.inputValue?.trim()) return;
    speechRecognition.stop();
    props.onSubmit?.();
  };

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
        class="fixed font-sans antialiased transition-opacity duration-300 ease-out filter-[drop-shadow(0px_0px_4px_#51515180)] select-none"
        style={{
          top: `${computedPosition().top}px`,
          left: `${computedPosition().left}px`,
          "z-index": "2147483647",
          "pointer-events":
            props.isInputExpanded ||
            (props.status === "copied" && props.onDismiss) ||
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

        <Show when={(props.status === "copied" || props.status === "fading") && !props.error}>
          <CompletedConfirmation
            statusText={props.hasAgent ? (props.statusText ?? "Completed") : "Copied"}
            onDismiss={props.onDismiss}
            onUndo={props.onUndo}
          />
        </Show>

        <div
          class="[font-synthesis:none] contain-layout flex items-center gap-[5px] rounded-xs bg-white antialiased w-fit h-fit p-0"
          style={{
            display:
              (props.status === "copied" || props.status === "fading") && !props.error
                ? "none"
                : undefined,
          }}
        >
          <Show when={props.status === "copying"}>
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit max-w-[280px]">
              <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 px-1.5 w-auto h-fit">
                <div class="contain-layout flex items-center px-0 py-px w-auto h-fit rounded-[1.5px] gap-[3px]">
                  <span class="text-[12px] leading-4 tracking-[-0.04em] font-sans font-medium w-auto h-fit whitespace-normal text-[#71717a] animate-pulse tabular-nums">
                    {props.statusText ?? "Grabbing…"}
                  </span>
                </div>
              </div>
              <BottomSection>
                <div class="shrink-0 flex justify-between items-end w-full min-h-4">
                  <textarea
                    ref={inputRef}
                    data-react-grab-ignore-events
                    class="text-black text-[12px] leading-4 tracking-[-0.04em] font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 opacity-50 wrap-break-word overflow-y-auto"
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
                      class="contain-layout shrink-0 flex flex-col items-start rounded-xs bg-white [border-width:0.5px] border-solid border-[#B3B3B3] p-1 size-fit cursor-pointer ml-1 transition-none hover:scale-105"
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

          <Show when={isNotProcessing() && !props.isInputExpanded}>
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit">
              <div
                class={cn(
                  "contain-layout shrink-0 flex items-center gap-1 pt-1 w-fit h-fit pl-1.5",
                  props.componentName ? "pr-1.5" : "pr-1",
                )}
              >
                <ClickToCopyPill
                  onClick={handleSubmit}
                  shrink
                  hasParent={Boolean(props.componentName)}
                  hasAgent={props.hasAgent}
                />
                <Show when={props.componentName}>
                  <div class="contain-layout shrink-0 flex items-center gap-px w-fit h-fit">
                    <ParentBadge name={props.componentName!} />
                    <ChevronSeparator />
                    <TagBadge
                      tagName={tagDisplay()}
                      isClickable={isTagClickable()}
                      onClick={handleTagClick}
                      onHoverChange={handleTagHoverChange}
                      showMono
                      shrink
                    />
                  </div>
                </Show>
                <Show when={!props.componentName}>
                  <TagBadge
                    tagName={tagDisplay()}
                    isClickable={isTagClickable()}
                    onClick={handleTagClick}
                    onHoverChange={handleTagHoverChange}
                    showMono
                    shrink
                  />
                </Show>
              </div>
              <div
                class="grid transition-[grid-template-rows] duration-30 ease-out self-stretch"
                style={{
                  "grid-template-rows": isIdle() ? "1fr" : "0fr",
                }}
              >
                <div class={cn("overflow-hidden min-h-0", !isIdle() && "w-0")}>
                  <BottomSection>
                    <div class="contain-layout shrink-0 flex items-center gap-1 w-fit h-fit">
                      <span class="text-label-muted text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-sans font-medium w-fit h-fit">
                        Press
                      </span>
                      <div class="contain-layout shrink-0 flex flex-col items-start px-[3px] py-[3px] rounded-xs bg-white [border-width:0.5px] border-solid border-[#B3B3B3] size-fit">
                        <IconReturn
                          size={10}
                          class="opacity-[0.99] text-black"
                        />
                      </div>
                      <span class="text-label-muted text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-sans font-medium w-fit h-fit">
                        or
                      </span>
                      <div class="contain-layout shrink-0 flex items-center px-[3px] py-px rounded-xs bg-white [border-width:0.5px] border-solid border-[#B3B3B3] size-fit">
                        <span class="text-black text-[10px] leading-[14px] tracking-[-0.04em] font-sans font-medium">
                          double-click
                        </span>
                      </div>
                      <span class="text-label-muted text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-sans font-medium w-fit h-fit">
                        to edit
                      </span>
                    </div>
                  </BottomSection>
                </div>
              </div>
            </div>
          </Show>

          <Show
            when={
              isNotProcessing() &&
              props.isInputExpanded &&
              !props.isPendingDismiss
            }
          >
            <div class="contain-layout shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit max-w-[280px]">
              <div
                class={cn(
                  "contain-layout shrink-0 flex items-center gap-1 pt-1 w-fit h-fit pl-1.5",
                  props.componentName ? "pr-1.5" : "pr-1",
                )}
              >
                <ClickToCopyPill
                  onClick={handleSubmit}
                  dimmed
                  shrink
                  hasParent={Boolean(props.componentName)}
                  hasAgent={props.hasAgent}
                />
                <Show when={props.componentName}>
                  <div class="contain-layout shrink-0 flex items-center gap-px w-fit h-fit">
                    <ParentBadge name={props.componentName!} />
                    <ChevronSeparator />
                    <TagBadge
                      tagName={tagDisplay()}
                      isClickable={isTagClickable()}
                      onClick={handleTagClick}
                      onHoverChange={handleTagHoverChange}
                      showMono
                      shrink
                      forceShowIcon
                    />
                  </div>
                </Show>
                <Show when={!props.componentName}>
                  <TagBadge
                    tagName={tagDisplay()}
                    isClickable={isTagClickable()}
                    onClick={handleTagClick}
                    onHoverChange={handleTagHoverChange}
                    showMono
                    shrink
                    forceShowIcon
                  />
                </Show>
              </div>
              <BottomSection>
                <div class="shrink-0 flex justify-between items-end w-full min-h-4">
                  <textarea
                    ref={inputRef}
                    data-react-grab-ignore-events
                    class="text-black text-[12px] leading-4 tracking-[-0.04em] font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 wrap-break-word overflow-y-auto"
                    style={{
                      "field-sizing": "content",
                      "min-height": "16px",
                      "max-height": "95px",
                      "scrollbar-width": "none",
                    }}
                    value={props.inputValue ?? ""}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      speechRecognition.isListening()
                        ? "listening..."
                        : "type prompt"
                    }
                    rows={1}
                  />
                  <div class="flex items-center gap-0.5 ml-1 w-[17px] h-[17px] justify-end">
                    <Show
                      when={
                        props.hasAgent &&
                        speechRecognition.isSupported() &&
                        !props.inputValue
                      }
                    >
                      <button
                        class={cn(
                          "contain-layout shrink-0 flex items-center justify-center px-[2px] py-[2px] rounded-xs [border-width:0.5px] border-solid size-fit cursor-pointer transition-all hover:scale-105",
                          speechRecognition.isListening()
                            ? "bg-grab-purple border-grab-purple text-white"
                            : "bg-white border-[#B3B3B3] text-black",
                        )}
                        onClick={speechRecognition.toggle}
                        title={
                          speechRecognition.isListening()
                            ? "Stop listening"
                            : "Start voice input"
                        }
                      >
                        <IconMic
                          size={11}
                          class={
                            speechRecognition.isListening()
                              ? "animate-pulse"
                              : ""
                          }
                        />
                      </button>
                    </Show>
                    <Show when={props.inputValue}>
                      <button
                        class="contain-layout shrink-0 flex flex-col items-start px-[3px] py-[3px] rounded-xs bg-white [border-width:0.5px] border-solid border-[#B3B3B3] size-fit cursor-pointer transition-all hover:scale-105"
                        onClick={handleSubmit}
                      >
                        <IconReturn
                          size={10}
                          class="opacity-[0.99] text-black"
                        />
                      </button>
                    </Show>
                  </div>
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
            />
          </Show>
        </div>
      </div>
    </Show>
  );
};
