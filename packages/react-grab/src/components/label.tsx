import { Show } from "solid-js";
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

interface LabelProps {
  variant: "hover" | "processing" | "success";
  text: string;
  x: number;
  y: number;
  visible?: boolean;
  zIndex?: number;
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

  const labelSegments = () => {
    const separator = " in ";
    const separatorIndex = props.text.indexOf(separator);

    if (separatorIndex === -1) {
      return { primary: props.text, secondary: "" };
    }

    return {
      primary: props.text.slice(0, separatorIndex),
      secondary: props.text.slice(separatorIndex),
    };
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
          <div style={{ "margin-right": "4px" }}>Copied</div>
        </Show>
        <Show when={props.variant === "processing"}>Grabbing…</Show>
        <Show when={props.variant !== "processing"}>
          <span
            style={{
              "font-family":
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              "font-variant-numeric": "tabular-nums",
              "vertical-align": "middle",
            }}
          >
            {labelSegments().primary}
          </span>
          <Show
            when={
              props.variant === "hover" && labelSegments().secondary !== ""
            }
          >
            <span
              style={{
                "font-variant-numeric": "tabular-nums",
                "font-size": "10px",
                "margin-left": "4px",
                "vertical-align": "middle",
              }}
            >
              {labelSegments().secondary}
            </span>
          </Show>
        </Show>
        <Show when={props.variant === "success"}>
          <div style={{ "margin-left": "4px" }}>to clipboard</div>
        </Show>
      </div>
    </Show>
  );
};
