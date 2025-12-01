import { Show, type JSX } from "solid-js";
import type { Component } from "solid-js";
import { Spinner } from "./spinner.js";
import {
  VIEWPORT_MARGIN_PX,
  INDICATOR_CLAMP_PADDING_PX,
  CURSOR_OFFSET_PX,
  SUCCESS_LABEL_DURATION_MS,
} from "../constants.js";
import { getClampedElementPosition } from "../utils/get-clamped-element-position.js";
import { useAnimatedPosition } from "../hooks/use-animated-lerp.js";
import { useFadeInOut } from "../hooks/use-fade-in-out.js";
import { getCursorQuadrants } from "../utils/get-cursor-quadrants.js";
import { cn } from "../utils/cn.js";

interface LabelProps {
  variant: "hover" | "processing" | "success" | "action";
  content: JSX.Element;
  x: number;
  y: number;
  visible?: boolean;
  zIndex?: number;
  progress?: number;
  showHint?: boolean;
}

export const Label: Component<LabelProps> = (props) => {
  let labelRef: HTMLDivElement | undefined;

  const position = useAnimatedPosition({
    x: () => props.x,
    y: () => props.y,
    lerpFactor: 0.3,
  });

  const opacity = useFadeInOut({
    visible: props.visible,
    autoFadeOutAfter:
      props.variant === "success" ? SUCCESS_LABEL_DURATION_MS : undefined,
  });

  const labelBoundingRect = () => labelRef?.getBoundingClientRect();

  const computedPosition = () => {
    const boundingRect = labelBoundingRect();
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

  return (
    <Show when={props.visible !== false}>
      <div
        ref={labelRef}
        class={cn(
          "fixed rounded text-[11px] font-medium font-sans pointer-events-none transition-opacity duration-200 ease-in-out overflow-hidden",
          props.variant === "action"
            ? "bg-grab-pink text-white"
            : "bg-grab-pink-light text-grab-pink border border-grab-pink-border"
        )}
        style={{
          top: `${computedPosition().top}px`,
          left: `${computedPosition().left}px`,
          "z-index": props.zIndex?.toString() ?? "2147483647",
          opacity: opacity(),
          "max-width":
            "calc(100vw - (16px + env(safe-area-inset-left) + env(safe-area-inset-right)))",
        }}
      >
        <Show when={props.variant === "processing" && props.progress !== undefined}>
          <div
            class="absolute top-0 left-0 bottom-0 bg-grab-pink/20 rounded-[3px] transition-[width] duration-100 ease-out pointer-events-none"
            style={{
              width: `${Math.min(100, Math.max(0, (props.progress ?? 0) * 100))}%`,
            }}
          />
        </Show>
        <div class="relative py-0.5 px-1.5 flex flex-col">
          <div class="flex items-center text-ellipsis whitespace-nowrap">
            <Show when={props.variant === "processing"}>
              <Spinner />
            </Show>
            <Show when={props.variant === "success"}>
              <span class="inline-block mr-1 font-semibold">
                ✓
              </span>
            </Show>
            <Show when={props.variant === "success"}>
              <div class="mr-1">Copied</div>
            </Show>
            <Show when={props.variant === "success"}>
              <span class="font-mono">{props.content}</span>
            </Show>
            <Show when={props.variant === "hover" || props.variant === "action"}>
              {props.content}
            </Show>
            <Show when={props.variant === "processing"}>
              {props.content}
            </Show>
            <Show when={props.variant === "success"}>
              <div class="ml-1">to clipboard</div>
            </Show>
          </div>
          <Show when={props.variant === "hover" && props.showHint}>
            <div class="text-[9px] opacity-60 text-center mt-0.5">
              Click or drag to select
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};
