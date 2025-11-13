import { createSignal, createEffect, onCleanup, Show, on } from "solid-js";
import type { Component } from "solid-js";
import { Spinner } from "./spinner.js";
import {
  VIEWPORT_MARGIN_PX,
  INDICATOR_CLAMP_PADDING_PX,
} from "../constants.js";
import { getClampedElementPosition } from "../utils/get-clamped-element-position.js";

interface LabelProps {
  variant: "hover" | "processing" | "success";
  text: string;
  x: number;
  y: number;
  visible?: boolean;
  zIndex?: number;
}

export const Label: Component<LabelProps> = (props) => {
  const [opacity, setOpacity] = createSignal(0);
  let labelRef: HTMLDivElement | undefined;

  createEffect(
    on(
      () => props.visible,
      (visible) => {
        if (visible !== false) {
          requestAnimationFrame(() => {
            setOpacity(1);
          });
        } else {
          setOpacity(0);
          return;
        }

        if (props.variant === "success") {
          const fadeOutTimer = setTimeout(() => {
            setOpacity(0);
          }, 1500);

          onCleanup(() => clearTimeout(fadeOutTimer));
        }
      },
    ),
  );

  const labelBoundingRect = () => labelRef?.getBoundingClientRect();

  const computedPosition = () => {
    const boundingRect = labelBoundingRect();
    if (!boundingRect) return { left: props.x, top: props.y };

    if (props.variant === "success") {
      const indicatorLeft = Math.round(props.x);
      const indicatorTop = Math.round(props.y) - boundingRect.height - 6;

      const willClampLeft = indicatorLeft < VIEWPORT_MARGIN_PX;
      const willClampTop = indicatorTop < VIEWPORT_MARGIN_PX;
      const isClamped = willClampLeft || willClampTop;

      const clamped = getClampedElementPosition(
        indicatorLeft,
        indicatorTop,
        boundingRect.width,
        boundingRect.height,
      );

      if (isClamped) {
        clamped.left += INDICATOR_CLAMP_PADDING_PX;
        clamped.top += INDICATOR_CLAMP_PADDING_PX;
      }

      return clamped;
    }

    const CROSSHAIR_OFFSET = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const quadrants = [
      {
        left: Math.round(props.x) + CROSSHAIR_OFFSET,
        top: Math.round(props.y) + CROSSHAIR_OFFSET,
      },
      {
        left: Math.round(props.x) - boundingRect.width - CROSSHAIR_OFFSET,
        top: Math.round(props.y) + CROSSHAIR_OFFSET,
      },
      {
        left: Math.round(props.x) + CROSSHAIR_OFFSET,
        top: Math.round(props.y) - boundingRect.height - CROSSHAIR_OFFSET,
      },
      {
        left: Math.round(props.x) - boundingRect.width - CROSSHAIR_OFFSET,
        top: Math.round(props.y) - boundingRect.height - CROSSHAIR_OFFSET,
      },
    ];

    for (const position of quadrants) {
      const fitsHorizontally =
        position.left >= VIEWPORT_MARGIN_PX &&
        position.left + boundingRect.width <= viewportWidth - VIEWPORT_MARGIN_PX;
      const fitsVertically =
        position.top >= VIEWPORT_MARGIN_PX &&
        position.top + boundingRect.height <= viewportHeight - VIEWPORT_MARGIN_PX;

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
        style={{
          position: "fixed",
          top: `${computedPosition().top}px`,
          left: `${computedPosition().left}px`,
          padding: "2px 6px",
          "background-color": "#fde7f7",
          color: "#b21c8e",
          border: "1px solid #f7c5ec",
          "border-radius": "4px",
          "font-size": "11px",
          "font-weight": "500",
          "font-family":
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          "z-index": props.zIndex?.toString() ?? "2147483647",
          "pointer-events": "none",
          opacity: opacity(),
          transition: "opacity 0.2s ease-in-out",
          display: "flex",
          "align-items": "center",
          "max-width":
            "calc(100vw - (16px + env(safe-area-inset-left) + env(safe-area-inset-right)))",
          overflow: "hidden",
          "text-overflow": "ellipsis",
          "white-space": "nowrap",
        }}
      >
        <Show when={props.variant === "processing"}>
          <Spinner />
        </Show>
        <Show when={props.variant === "success"}>
          <span
            style={{
              display: "inline-block",
              "margin-right": "4px",
              "font-weight": "600",
            }}
          >
            ✓
          </span>
        </Show>
        <Show when={props.variant === "success"}>
          <div style={{ "margin-right": "4px" }}>Grabbed</div>
        </Show>
        <Show when={props.variant === "processing"}>Grabbing…</Show>
        <span
          style={{
            "font-family":
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            "font-variant-numeric": "tabular-nums",
          }}
        >
          {props.text}
        </span>
      </div>
    </Show>
  );
};
