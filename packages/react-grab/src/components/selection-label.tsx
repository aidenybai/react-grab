import { Show, createSignal, createEffect, onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { OverlayBounds, SelectionLabelStatus } from "../types.js";
import { VIEWPORT_MARGIN_PX } from "../constants.js";
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

export const SelectionLabel: Component<SelectionLabelProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let inputRef: HTMLTextAreaElement | undefined;

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [arrowPosition, setArrowPosition] = createSignal<ArrowPosition>("bottom");
  const [viewportVersion, setViewportVersion] = createSignal(0);

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

  onMount(() => {
    measureContainer();
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
  });

  onCleanup(() => {
    window.removeEventListener("scroll", handleViewportChange, true);
    window.removeEventListener("resize", handleViewportChange);
  });

  createEffect(() => {
    if (props.visible) {
      requestAnimationFrame(measureContainer);
    }
  });

  createEffect(() => {
    void [props.status, props.isInputExpanded, props.inputValue];
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
    const fitsBelow = positionTop + labelHeight <= viewportHeight - VIEWPORT_MARGIN_PX;

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
      Math.min(selectionCenterX - positionLeft, labelWidth - 12)
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
        data-react-grab-selection-label
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
          class="relative flex items-center gap-[7px] rounded-[7px] overflow-hidden bg-white"
          style={{
            padding: props.isInputExpanded ? "4px 6px 4px 4px" : "3px 7px 3px 3px",
            "box-shadow": "0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <Show when={props.status === "copying"}>
            <div
              class="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(247,197,236,0.5) 50%, transparent 100%)",
                "background-size": "200% 100%",
                animation: "shimmer 1.5s ease-in-out infinite",
              }}
            />
            <style>{`
              @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
          </Show>

          <div class="flex items-center gap-1">
            <div
              class="flex items-center px-[5px] py-px rounded-[3.5px]"
              style={{
                "background-image": "linear-gradient(180deg, oklch(91.9% 0.061 325) 0%, oklch(88.3% 0.090 325) 100%)",
                border: "0.5px solid #D133D9",
              }}
            >
              <span class="text-[#A000A6] text-[12px] leading-4 font-medium tracking-[-0.02em]">
                {tagDisplay()}
              </span>
            </div>

            <Show when={props.status === "copied" || props.status === "fading"}>
              <span class="text-[#A000A6] text-[12px] leading-4 font-medium tracking-[-0.02em] px-0.5">
                Copied
              </span>
            </Show>

            <Show when={props.status === "copying"}>
              <span class="text-[#A000A6] text-[12px] leading-4 font-medium tracking-[-0.02em] px-0.5">
                {props.statusText ?? "Please wait…"}
              </span>
            </Show>

            <Show when={!props.isInputExpanded && props.status !== "copying" && props.status !== "copied" && props.status !== "fading"}>
              <div class="flex items-center px-0.5">
                <span class="text-[#323232] text-[12px] leading-4 font-medium tracking-[-0.02em]">
                  Hit
                </span>
                <IconReturnKey size={14} class="mx-1 text-[#323232]" />
                <span class="text-[#323232] text-[12px] leading-4 font-medium tracking-[-0.02em]">
                  to edit
                </span>
              </div>
            </Show>

            <Show when={props.isInputExpanded && props.status !== "copying" && props.status !== "copied" && props.status !== "fading"}>
              <div
                class="grid rounded-[3px] bg-white border border-[#DFDFDF]"
                style={{ "grid-template-columns": "1fr" }}
              >
                <span
                  class="invisible whitespace-pre-wrap wrap-break-word text-[12px] leading-4 font-medium min-w-[100px] max-w-[300px] px-[5px] py-px col-start-1 row-start-1"
                  style={{ "word-break": "break-word", "overflow-wrap": "break-word" }}
                  aria-hidden="true"
                >
                  {props.inputValue || "make a change"}{"\u200B"}
                </span>
                <textarea
                  ref={inputRef}
                  value={props.inputValue ?? ""}
                  onInput={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder="make a change"
                  rows={1}
                  class="text-[#4F4F4F] text-[12px] leading-4 font-medium bg-transparent border-none outline-none resize-none min-h-[16px] px-[5px] py-px col-start-1 row-start-1 whitespace-pre-wrap break-words min-w-[100px] max-w-[300px] placeholder:text-[#9F9F9F] placeholder:italic overflow-hidden"
                  style={{ "word-break": "break-word", "overflow-wrap": "break-word" }}
                />
              </div>
            </Show>
          </div>

          <Show when={props.isInputExpanded && props.status !== "copying" && props.status !== "copied" && props.status !== "fading"}>
            <div class="w-px h-3.5 bg-[#D3D3D3]" />

            <button
              class="flex items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-none p-0"
              onClick={() => props.onSubmit?.()}
            >
              <IconReturnKey size={14} class="text-black" />
              <span class="text-black text-[12px] leading-4 font-semibold">
                {props.hasAgent ? "Send" : "Copy"}
              </span>
            </button>
          </Show>
        </div>
      </div>
    </Show>
  );
};
