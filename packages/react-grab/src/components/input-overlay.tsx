import { createEffect } from "solid-js";
import type { Component } from "solid-js";
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
  onInput: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const InputOverlay: Component<InputOverlayProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let inputRef: HTMLTextAreaElement | undefined;

  const position = useAnimatedPosition({
    x: () => props.x,
    y: () => props.y,
    lerpFactor: 0.3,
  });

  const containerBoundingRect = () => containerRef?.getBoundingClientRect();

  const computedPosition = () => {
    const boundingRect = containerBoundingRect();
    if (!boundingRect) return { left: position.x(), top: position.y() };

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const quadrants = getCursorQuadrants(
      position.x(),
      position.y(),
      boundingRect.width,
      boundingRect.height,
      CURSOR_OFFSET_PX,
    );

    for (const position of quadrants) {
      const fitsHorizontally =
        position.left >= VIEWPORT_MARGIN_PX &&
        position.left + boundingRect.width <=
          viewportWidth - VIEWPORT_MARGIN_PX;
      const fitsVertically =
        position.top >= VIEWPORT_MARGIN_PX &&
        position.top + boundingRect.height <=
          viewportHeight - VIEWPORT_MARGIN_PX;

      if (fitsHorizontally && fitsVertically) {
        return position;
      }
    }

    const fallback = getClampedElementPosition(
      quadrants[0].left,
      quadrants[0].top,
      boundingRect.width,
      boundingRect.height,
    );

    fallback.left += INDICATOR_CLAMP_PADDING_PX;
    fallback.top += INDICATOR_CLAMP_PADDING_PX;

    return fallback;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    // NOTE: we use event.code instead of event.key for keyboard layout compatibility (e.g., AZERTY, QWERTZ)
    if (event.code === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      props.onSubmit();
    } else if (event.code === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      props.onCancel();
    }
  };

  const handleInput = (event: InputEvent) => {
    const target = event.target as HTMLTextAreaElement;
    props.onInput(target.value);
    autoResizeTextarea(target);
  };

  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  createEffect(() => {
    if (props.visible && inputRef) {
      inputRef.focus();
      inputRef.style.height = "auto";
    } else if (!props.visible && inputRef) {
      inputRef.blur();
    }
  });

  return (
    <div
      ref={containerRef}
      data-react-grab-input
      class="fixed bg-grab-pink-light text-grab-pink border border-grab-pink-border rounded text-[11px] font-medium font-sans overflow-hidden"
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
      <div class="relative p-0.5 px-[3px] flex flex-col gap-0.5">
        <textarea
          ref={inputRef}
          value={props.value}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Make a change"
          rows={1}
          class="w-[150px] px-1 py-0.5 bg-white text-grab-pink border border-grab-pink-border rounded-[3px] text-[11px] leading-tight font-sans outline-none resize-none min-h-[18px] overflow-hidden"
        />
        <div class="text-[9px] opacity-60 text-center">
          Enter ⏎ submit &middot; Esc cancel
        </div>
      </div>
    </div>
  );
};
