import { Show, createSignal, createEffect, onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { OverlayBounds, SelectionLabelStatus } from "../types.js";
import { VIEWPORT_MARGIN_PX } from "../constants.js";
import { IconCheckmark } from "./icon-checkmark.js";
import { IconCursorSimple } from "./icon-cursor-simple.js";
import { IconReturnKey } from "./icon-return-key.js";

interface SelectionLabelProps {
  tagName?: string;
  selectionBounds?: OverlayBounds;
  visible?: boolean;
  isInputExpanded?: boolean;
  inputValue?: string;
  hasAgent?: boolean;
  status?: SelectionLabelStatus;
  statusText?: string;
  onInputChange?: (value: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  onToggleExpand?: () => void;
}

type ArrowPosition = "bottom" | "top";

const ARROW_HEIGHT = 8;
const LABEL_GAP = 4;
const IDLE_TIMEOUT_MS = 150;

export const SelectionLabel: Component<SelectionLabelProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let inputRef: HTMLTextAreaElement | undefined;

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [arrowPosition, setArrowPosition] =
    createSignal<ArrowPosition>("bottom");
  const [viewportVersion, setViewportVersion] = createSignal(0);
  const [isIdle, setIsIdle] = createSignal(false);

  const measureContainer = () => {
    if (containerRef) {
      const rect = containerRef.getBoundingClientRect();
      setMeasuredWidth(rect.width);
      setMeasuredHeight(rect.height);
    }
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
    if (
      event.code === "Enter" &&
      isIdle() &&
      !props.isInputExpanded &&
      props.status !== "copying" &&
      props.status !== "copied" &&
      props.status !== "fading"
    ) {
      event.preventDefault();
      event.stopPropagation();
      props.onToggleExpand?.();
    }
  };

  onMount(() => {
    measureContainer();
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("mousemove", resetIdleTimer);
    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true });
    resetIdleTimer();
  });

  onCleanup(() => {
    window.removeEventListener("scroll", handleViewportChange, true);
    window.removeEventListener("resize", handleViewportChange);
    window.removeEventListener("mousemove", resetIdleTimer);
    window.removeEventListener("keydown", handleGlobalKeyDown, {
      capture: true,
    });
    if (idleTimeout) {
      clearTimeout(idleTimeout);
    }
  });

  createEffect(() => {
    if (props.visible) {
      requestAnimationFrame(measureContainer);
    }
  });

  createEffect(() => {
    void [props.status, props.isInputExpanded, props.inputValue, isIdle()];
    requestAnimationFrame(measureContainer);
  });

  createEffect(() => {
    if (props.isInputExpanded && inputRef) {
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

    if (!bounds || labelWidth === 0 || labelHeight === 0) {
      return { left: -9999, top: -9999, arrowLeft: 0 };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const selectionCenterX = bounds.x + bounds.width / 2;
    const selectionBottom = bounds.y + bounds.height;
    const selectionTop = bounds.y;

    let positionLeft = selectionCenterX - labelWidth / 2;
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
      Math.min(selectionCenterX - positionLeft, labelWidth - 12),
    );

    return { left: positionLeft, top: positionTop, arrowLeft };
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();

    if (event.code === "Enter" && !event.shiftKey) {
      event.preventDefault();
      props.onSubmit?.();
    } else if (event.code === "Escape") {
      event.preventDefault();
      props.onCancel?.();
    }
  };

  const handleInput = (event: InputEvent) => {
    const target = event.target as HTMLTextAreaElement;
    props.onInputChange?.(target.value);
  };

  const tagDisplay = () => props.tagName || "element";

  const stopPropagation = (event: MouseEvent) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  return (
    <Show when={props.visible !== false && props.selectionBounds}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        class="fixed font-sans antialiased transition-opacity duration-300 ease-out"
        style={{
          top: `${computedPosition().top}px`,
          left: `${computedPosition().left}px`,
          "z-index": "2147483647",
          "pointer-events": props.visible ? "auto" : "none",
          opacity: props.status === "fading" ? 0 : 1,
        }}
        onMouseDown={stopPropagation}
        onClick={stopPropagation}
      >
        <Show when={arrowPosition() === "bottom"}>
          <div
            class="absolute w-0 h-0"
            style={{
              left: `${computedPosition().arrowLeft}px`,
              top: "0",
              transform: "translateX(-50%) translateY(-100%)",
              "border-left": "8px solid transparent",
              "border-right": "8px solid transparent",
              "border-bottom": "8px solid white",
              "z-index": "1",
            }}
          />
        </Show>
        <Show when={arrowPosition() === "top"}>
          <div
            class="absolute w-0 h-0"
            style={{
              left: `${computedPosition().arrowLeft}px`,
              bottom: "0",
              transform: "translateX(-50%) translateY(100%)",
              "border-left": "8px solid transparent",
              "border-right": "8px solid transparent",
              "border-top": "8px solid white",
              "z-index": "1",
            }}
          />
        </Show>

        <div
          class="relative flex items-center gap-[5px] bg-white rounded-[3px]"
          style={{
            padding:
              props.status === "copying" ||
              props.status === "copied" ||
              props.status === "fading"
                ? "4px"
                : isIdle() || props.isInputExpanded
                  ? "0"
                  : "4px",
            "box-shadow": "#00000033 0px 2px 3px",
          }}
        >
          <Show when={props.status === "copied" || props.status === "fading"}>
            <div class="flex items-center gap-[3px]">
              <div
                class="flex items-center px-1 py-px h-[18px] rounded-[1.5px] gap-[5px]"
                style={{
                  "background-image":
                    "linear-gradient(in oklab 180deg, oklab(88.7% 0.086 -0.058) 0%, oklab(83.2% 0.132 -0.089) 100%)",
                  "border-width": "0.5px",
                  "border-style": "solid",
                  "border-color": "#730079",
                }}
              >
                <span class="text-[#1E001F] text-[12px] leading-4 font-medium tracking-[-0.04em]">
                  {tagDisplay()}
                </span>
              </div>
              <div
                class="flex items-center h-[18px] rounded-[1.5px] gap-[3px]"
                style={{
                  "padding-left": "5px",
                  "padding-right": "5px",
                  "padding-top": "1px",
                  "padding-bottom": "1px",
                  background: "#D9FFE4",
                  "border-width": "0.5px",
                  "border-style": "solid",
                  "border-color": "#00BB69",
                }}
              >
                <IconCheckmark size={9} class="text-[#006E3B] shrink-0" />
                <span class="text-[#006E3B] text-[12px] leading-4 font-medium tracking-[-0.04em]">
                  {props.hasAgent ? "Completed" : "Copied"}
                </span>
              </div>
            </div>
          </Show>

          <Show when={props.status === "copying"}>
            <div class="flex items-center gap-[3px] react-grab-shimmer rounded-[3px]">
              <div
                class="flex items-center px-1 py-px h-[18px] rounded-[1.5px] gap-[5px]"
                style={{
                  "background-image":
                    "linear-gradient(in oklab 180deg, oklab(88.7% 0.086 -0.058) 0%, oklab(83.2% 0.132 -0.089) 100%)",
                  "border-width": "0.5px",
                  "border-style": "solid",
                  "border-color": "#730079",
                }}
              >
                <span class="text-[#1E001F] text-[12px] leading-4 font-medium tracking-[-0.04em]">
                  {tagDisplay()}
                </span>
              </div>
              <div
                class="flex items-center h-[18px] rounded-[1.5px] gap-[3px]"
                style={{
                  "padding-left": "5px",
                  "padding-right": "5px",
                  "padding-top": "1px",
                  "padding-bottom": "1px",
                  "border-width": "0.5px",
                  "border-style": "solid",
                  "border-color": "#B0B0B0",
                }}
              >
                <IconCursorSimple size={9} class="text-black shrink-0" />
                <span class="text-black text-[12px] leading-4 font-medium tracking-[-0.04em]">
                  {props.statusText ?? "Grabbing…"}
                </span>
              </div>
            </div>
          </Show>

          {/* State 1: Hover (not idle, not expanded) */}
          <Show
            when={
              props.status !== "copying" &&
              props.status !== "copied" &&
              props.status !== "fading" &&
              !isIdle() &&
              !props.isInputExpanded
            }
          >
            <div class="flex items-center gap-[3px]">
              <div
                class="flex items-center px-1 py-px h-[18px] rounded-[1.5px] gap-[5px]"
                style={{
                  "background-image":
                    "linear-gradient(in oklab 180deg, oklab(88.7% 0.086 -0.058) 0%, oklab(83.2% 0.132 -0.089) 100%)",
                  "border-width": "0.5px",
                  "border-style": "solid",
                  "border-color": "#730079",
                }}
              >
                <span class="text-[#1E001F] text-[12px] leading-4 font-medium tracking-[-0.04em]">
                  {tagDisplay()}
                </span>
              </div>
              <button
                class="flex items-center h-[18px] rounded-[1.5px] gap-[3px] cursor-pointer bg-transparent"
                style={{
                  "padding-left": "5px",
                  "padding-right": "5px",
                  "padding-top": "1px",
                  "padding-bottom": "1px",
                  "border-width": "0.5px",
                  "border-style": "solid",
                  "border-color": "#B0B0B0",
                }}
                onClick={() => props.onSubmit?.()}
              >
                <IconCursorSimple size={9} class="text-black shrink-0" />
                <span class="text-black text-[12px] leading-4 font-medium tracking-[-0.04em]">
                  Click to copy
                </span>
              </button>
            </div>
          </Show>

          {/* State 2: Idle (showing "to modify" hint) */}
          <Show
            when={
              props.status !== "copying" &&
              props.status !== "copied" &&
              props.status !== "fading" &&
              isIdle() &&
              !props.isInputExpanded
            }
          >
            <div class="shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit">
              <div class="shrink-0 flex items-center gap-[3px] pt-1 w-fit h-fit px-1">
                <div
                  class="shrink-0 flex items-center px-1 py-px w-fit h-[18px] rounded-[1.5px] gap-[5px]"
                  style={{
                    "background-image":
                      "linear-gradient(in oklab 180deg, oklab(88.7% 0.086 -0.058) 0%, oklab(83.2% 0.132 -0.089) 100%)",
                    "border-width": "0.5px",
                    "border-style": "solid",
                    "border-color": "#730079",
                  }}
                >
                  <span class="text-[#1E001F] text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-medium w-fit h-fit">
                    {tagDisplay()}
                  </span>
                </div>
                <div
                  class="shrink-0 flex items-center w-fit h-[18px] rounded-[1.5px] gap-[3px] cursor-pointer"
                  style={{
                    "padding-left": "5px",
                    "padding-right": "5px",
                    "padding-top": "1px",
                    "padding-bottom": "1px",
                    "border-width": "0.5px",
                    "border-style": "solid",
                    "border-color": "#B0B0B0",
                  }}
                  role="button"
                  onClick={() => props.onSubmit?.()}
                >
                  <IconCursorSimple size={9} class="text-black shrink-0" />
                  <span class="text-black text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-medium w-fit h-fit">
                    Click to copy
                  </span>
                </div>
              </div>
              <div
                class="shrink-0 flex flex-col items-start px-2 py-[5px] w-full h-fit rounded-bl-[3px] rounded-br-[3px]"
                style={{
                  "border-top-width": "0.5px",
                  "border-top-style": "solid",
                  "border-top-color": "#DEDEDE",
                }}
              >
                <div class="shrink-0 flex items-center gap-1 w-full h-[14px]">
                  <IconReturnKey size={10} class="shrink-0 text-black opacity-[0.65]" />
                  <span class="text-[#767676] text-[11px] leading-3.5 shrink-0 tracking-[-0.04em] font-medium w-fit h-fit">
                    to change
                  </span>
                </div>
              </div>
            </div>
          </Show>

          {/* State 3: Input expanded (with textarea and submit icon) */}
          <Show
            when={
              props.status !== "copying" &&
              props.status !== "copied" &&
              props.status !== "fading" &&
              props.isInputExpanded
            }
          >
            <div class="shrink-0 flex flex-col justify-center items-start gap-1 w-fit h-fit">
              <div class="shrink-0 flex items-center gap-[3px] pt-1 w-fit h-fit px-1">
                <div
                  class="shrink-0 flex items-center px-1 py-px w-fit h-[18px] rounded-[1.5px] gap-[5px]"
                  style={{
                    "background-image":
                      "linear-gradient(in oklab 180deg, oklab(88.7% 0.086 -0.058) 0%, oklab(83.2% 0.132 -0.089) 100%)",
                    "border-width": "0.5px",
                    "border-style": "solid",
                    "border-color": "#730079",
                  }}
                >
                  <span class="text-[#1E001F] text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-medium w-fit h-fit">
                    {tagDisplay()}
                  </span>
                </div>
                <div
                  class="shrink-0 flex items-center w-fit h-[18px] rounded-[1.5px] gap-[3px] cursor-pointer transition-opacity hover:opacity-100 opacity-50"
                  style={{
                    "padding-left": "5px",
                    "padding-right": "5px",
                    "padding-top": "1px",
                    "padding-bottom": "1px",
                    "border-width": "0.5px",
                    "border-style": "solid",
                    "border-color": "#B0B0B0",
                  }}
                  role="button"
                  onClick={() => props.onSubmit?.()}
                >
                  <IconCursorSimple size={9} class="text-black shrink-0" />
                  <span class="text-black text-[12px] leading-4 shrink-0 tracking-[-0.04em] font-medium w-fit h-fit">
                    Click to copy
                  </span>
                </div>
              </div>
              <div
                class="shrink-0 flex flex-col items-start px-2 py-[5px] w-full h-fit rounded-bl-[3px] rounded-br-[3px]"
                style={{
                  "border-top-width": "0.5px",
                  "border-top-style": "solid",
                  "border-top-color": "#DEDEDE",
                }}
              >
                <div class="shrink-0 flex justify-between items-start w-full min-h-[14px]">
                  <textarea
                    ref={inputRef}
                    class="text-black text-[11px] leading-3.5 tracking-[-0.04em] font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0"
                    style={{
                      // @ts-expect-error - field-sizing is not in the jsx spec
                      "field-sizing": "content",
                      "min-height": "14px",
                    }}
                    value={props.inputValue ?? ""}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="type to modify..."
                    rows={1}
                  />
                  <button
                    class="shrink-0 flex items-center gap-1 w-fit h-fit cursor-pointer bg-transparent border-none p-0 ml-1 mt-[2.5px]"
                    onClick={() => props.onSubmit?.()}
                  >
                    <IconReturnKey size={10} class="shrink-0 text-black" />
                  </button>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};
