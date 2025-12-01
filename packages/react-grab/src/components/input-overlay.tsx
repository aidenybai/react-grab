import { createEffect, createSignal, onMount, Show } from "solid-js";
import type { Component } from "solid-js";
import type { OverlayBounds } from "../types.js";
import {
  VIEWPORT_MARGIN_PX,
  INDICATOR_CLAMP_PADDING_PX,
  CURSOR_OFFSET_PX,
} from "../constants.js";
import { getClampedElementPosition } from "../utils/get-clamped-element-position.js";
import { useAnimatedPosition } from "../hooks/use-animated-lerp.js";
import { getCursorQuadrants } from "../utils/get-cursor-quadrants.js";

interface InputOverlayProps {
  x: number;
  y: number;
  zIndex?: number;
  value: string;
  visible: boolean;
  selectionBounds?: OverlayBounds;
  mode?: "input" | "output";
  statusText?: string;
  onInput: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const InputOverlay: Component<InputOverlayProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let inputRef: HTMLTextAreaElement | undefined;

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);

  const measureContainer = () => {
    if (containerRef) {
      const rect = containerRef.getBoundingClientRect();
      setMeasuredWidth(rect.width);
      setMeasuredHeight(rect.height);
    }
  };

  onMount(() => {
    measureContainer();
  });

  createEffect(() => {
    if (props.visible) {
      requestAnimationFrame(measureContainer);
    }
  });

  const position = useAnimatedPosition({
    x: () => props.x,
    y: () => props.y,
    lerpFactor: 0.3,
  });

  const computedPosition = () => {
    const inputWidth = measuredWidth();
    const inputHeight = measuredHeight();

    if (inputWidth === 0 || inputHeight === 0) {
      return { left: -9999, top: -9999 };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (props.selectionBounds) {
      const selectionCenterX = props.selectionBounds.x + props.selectionBounds.width / 2;
      const selectionBottom = props.selectionBounds.y + props.selectionBounds.height;

      let positionLeft = selectionCenterX - inputWidth / 2;
      let positionTop = selectionBottom + 8;

      if (positionLeft + inputWidth > viewportWidth - VIEWPORT_MARGIN_PX) {
        positionLeft = viewportWidth - inputWidth - VIEWPORT_MARGIN_PX;
      }
      if (positionLeft < VIEWPORT_MARGIN_PX) {
        positionLeft = VIEWPORT_MARGIN_PX;
      }

      const fitsBelow = positionTop + inputHeight <= viewportHeight - VIEWPORT_MARGIN_PX;
      if (!fitsBelow) {
        positionTop = props.selectionBounds.y - inputHeight - 8;
      }

      if (positionTop < VIEWPORT_MARGIN_PX) {
        positionTop = VIEWPORT_MARGIN_PX;
      }

      return { left: positionLeft, top: positionTop };
    }

    const quadrants = getCursorQuadrants(
      position.x(),
      position.y(),
      inputWidth,
      inputHeight,
      CURSOR_OFFSET_PX,
    );

    for (const quadrantPosition of quadrants) {
      const fitsHorizontally =
        quadrantPosition.left >= VIEWPORT_MARGIN_PX &&
        quadrantPosition.left + inputWidth <=
          viewportWidth - VIEWPORT_MARGIN_PX;
      const fitsVertically =
        quadrantPosition.top >= VIEWPORT_MARGIN_PX &&
        quadrantPosition.top + inputHeight <=
          viewportHeight - VIEWPORT_MARGIN_PX;

      if (fitsHorizontally && fitsVertically) {
        return quadrantPosition;
      }
    }

    const fallback = getClampedElementPosition(
      quadrants[0].left,
      quadrants[0].top,
      inputWidth,
      inputHeight,
    );

    fallback.left += INDICATOR_CLAMP_PADDING_PX;
    fallback.top += INDICATOR_CLAMP_PADDING_PX;

    return fallback;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();

    if (event.code === "Enter" && !event.shiftKey) {
      event.preventDefault();
      props.onSubmit();
    } else if (event.code === "Escape") {
      event.preventDefault();
      props.onCancel();
    }
  };

  const handleInput = (event: InputEvent) => {
    const target = event.target as HTMLTextAreaElement;
    props.onInput(target.value);
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  };

  const isInputMode = () => props.mode !== "output";

  createEffect(() => {
    if (props.visible && inputRef && isInputMode()) {
      setTimeout(() => {
        inputRef?.focus();
      }, 0);
      inputRef.style.height = "auto";
    } else if (!props.visible && inputRef) {
      inputRef.blur();
    }
  });

  return (
    <div
      ref={containerRef}
      data-react-grab-input
      class="fixed bg-grab-pink text-white border border-grab-pink rounded text-[11px] font-medium font-sans overflow-hidden shadow-lg"
      style={{
        display: props.visible ? "block" : "none",
        top: `${computedPosition().top}px`,
        left: `${computedPosition().left}px`,
        "z-index": props.zIndex?.toString() ?? "2147483647",
        "pointer-events": props.visible ? "auto" : "none",
        "max-width":
          "calc(100vw - (16px + env(safe-area-inset-left) + env(safe-area-inset-right)))",
      }}
    >
      <Show when={isInputMode()}>
        <div class="relative p-0.5 px-[3px] flex flex-col gap-0.5">
          <textarea
            ref={inputRef}
            value={props.value}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Make a change"
            rows={1}
            class="w-[150px] px-1 py-0.5 bg-white/15 text-white border-none rounded-[3px] text-[11px] leading-tight font-sans outline-none resize-none min-h-[18px] overflow-hidden placeholder:text-white/50"
          />
          <div class="text-[9px] opacity-70 text-center">
            Enter ⏎ submit &middot; Esc cancel
          </div>
        </div>
      </Show>
      <Show when={!isInputMode()}>
        <div class="relative p-1.5 px-2 flex flex-col gap-1 min-w-[150px] max-w-[300px]">
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-white animate-pulse" />
            <div class="text-[11px] leading-tight wrap-break-word">
              {props.statusText || "Please wait..."}
            </div>
          </div>
          <div class="text-[9px] opacity-70 text-center">
            Esc to cancel
          </div>
        </div>
      </Show>
    </div>
  );
};
