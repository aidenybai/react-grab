import { Show, createSignal, createEffect, onCleanup, onMount } from "solid-js";
import type { Component } from "solid-js";
import { SELECTION_CURSOR_SETTLE_DELAY_MS, VIEWPORT_MARGIN_PX } from "../constants.js";
import type { OverlayBounds } from "../types.js";
import { SelectionBox } from "./selection-box.js";
import { IconPointer } from "./icon-pointer.js";
import { cn } from "../utils/cn.js";

interface SelectionCursorProps {
  x: number;
  y: number;
  tagName?: string;
  componentName?: string;
  elementBounds?: OverlayBounds;
  visible?: boolean;
  onClick?: () => void;
  onEnter?: () => void;
}

type ArrowPosition = "bottom" | "top";

const ARROW_HEIGHT = 8;
const LABEL_GAP = 4;

export const SelectionCursor: Component<SelectionCursorProps> = (props) => {
  let labelRef: HTMLDivElement | undefined;

  const [isHovered, setIsHovered] = createSignal(false);
  const [debouncedVisible, setDebouncedVisible] = createSignal(false);
  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [arrowPosition, setArrowPosition] = createSignal<ArrowPosition>("bottom");

  const measureLabel = () => {
    if (labelRef) {
      const rect = labelRef.getBoundingClientRect();
      setMeasuredWidth(rect.width);
      setMeasuredHeight(rect.height);
    }
  };

  onMount(() => {
    measureLabel();
  });

  createEffect(() => {
    if (isHovered()) {
      requestAnimationFrame(measureLabel);
    }
  });

  createEffect(() => {
    const isVisible = props.visible !== false;
    void [props.x, props.y];

    setDebouncedVisible(false);

    if (isVisible) {
      const timeout = setTimeout(() => setDebouncedVisible(true), SELECTION_CURSOR_SETTLE_DELAY_MS);
      onCleanup(() => clearTimeout(timeout));
    }
  });

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    props.onClick?.();
  };

  createEffect(() => {
    if (!isHovered()) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && isHovered()) {
        event.preventDefault();
        event.stopPropagation();
        props.onEnter?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown, { capture: true }));
  });

  const computedLabelPosition = () => {
    const bounds = props.elementBounds;
    const labelWidth = measuredWidth();
    const labelHeight = measuredHeight();

    if (!bounds || labelWidth === 0 || labelHeight === 0) {
      return { left: props.x - labelWidth / 2, top: props.y + 20, arrowLeft: labelWidth / 2 };
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

  const tagDisplay = () => props.tagName || "element";

  return (
    <Show when={debouncedVisible()}>
      <Show when={isHovered() && props.elementBounds}>
        <SelectionBox
          variant="selection"
          bounds={props.elementBounds!}
          visible={true}
        />
      </Show>

      <div
        class="fixed z-2147483647"
        style={{
          left: `${props.x}px`,
          top: `${props.y}px`,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          class={cn(
            "absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 bg-grab-pink cursor-pointer rounded-full transition-[width,height] duration-150",
            isHovered() ? "w-1 h-5.5 brightness-125" : "w-0.5 h-5 animate-pulse"
          )}
          onClick={handleClick}
          data-react-grab-selection-cursor
        />
      </div>

      <Show when={isHovered() && props.elementBounds}>
        <div
          ref={labelRef}
          class="fixed font-sans antialiased z-2147483647 transition-opacity duration-150"
          style={{
            top: `${computedLabelPosition().top}px`,
            left: `${computedLabelPosition().left}px`,
          }}
        >
          <div
            class={cn(
              "absolute w-0 h-0 border-x-8 border-x-transparent",
              arrowPosition() === "bottom"
                ? "top-0 -translate-y-full border-b-8 border-b-white"
                : "bottom-0 translate-y-full border-t-8 border-t-white"
            )}
            style={{
              left: `${computedLabelPosition().arrowLeft}px`,
              transform: "translateX(-50%)",
              filter: "drop-shadow(0 -1px 1px rgba(0,0,0,0.08))",
            }}
          />

          <div
            class="flex items-center gap-[7px] rounded-[7px] bg-white"
            style={{
              padding: "3px 7px 3px 3px",
              "box-shadow": "0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
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

              <button
                class="flex justify-center items-center gap-0.5 px-1.5 py-0.5 cursor-pointer hover:bg-[#F0F0F0] transition-colors bg-transparent border-none rounded-[4px]"
                onClick={handleClick}
              >
                <IconPointer size={13} class="text-black" />
                <span class="text-black text-[11px] leading-3.5 font-medium tracking-[-0.02em]">
                  to copy
                </span>
              </button>
            </div>
          </div>
        </div>
      </Show>
    </Show>
  );
};
