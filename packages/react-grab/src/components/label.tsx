import { createSignal, createEffect, onCleanup, Show, on } from "solid-js";
import type { Component } from "solid-js";
import { Spinner } from "./spinner.js";
import {
  VIEWPORT_MARGIN_PX,
  INDICATOR_CLAMP_PADDING_PX,
  CURSOR_OFFSET_PX,
  SUCCESS_LABEL_DURATION_MS,
} from "../constants.js";
import { getClampedElementPosition } from "../utils/get-clamped-element-position.js";
import { lerp } from "../utils/lerp.js";

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
  const [positionTick, setPositionTick] = createSignal(0);
  let labelRef: HTMLDivElement | undefined;
  let currentX = props.x;
  let currentY = props.y;
  let targetX = props.x;
  let targetY = props.y;
  let animationFrameId: number | null = null;
  let hasBeenRenderedOnce = false;

  const animate = () => {
    currentX = lerp(currentX, targetX, 0.3);
    currentY = lerp(currentY, targetY, 0.3);

    setPositionTick((tick) => tick + 1);

    const hasConvergedToTarget =
      Math.abs(currentX - targetX) < 0.5 && Math.abs(currentY - targetY) < 0.5;

    if (!hasConvergedToTarget) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      animationFrameId = null;
    }
  };

  const startAnimation = () => {
    if (animationFrameId !== null) return;
    animationFrameId = requestAnimationFrame(animate);
  };

  const updateTarget = () => {
    targetX = props.x;
    targetY = props.y;

    if (!hasBeenRenderedOnce) {
      currentX = targetX;
      currentY = targetY;
      hasBeenRenderedOnce = true;
      setPositionTick((tick) => tick + 1);
      return;
    }

    startAnimation();
  };

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
          }, SUCCESS_LABEL_DURATION_MS);

          onCleanup(() => clearTimeout(fadeOutTimer));
        }
      },
    ),
  );

  createEffect(() => {
    updateTarget();
  });

  onCleanup(() => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  });

  const labelBoundingRect = () => labelRef?.getBoundingClientRect();

  const computedPosition = () => {
    positionTick();
    const boundingRect = labelBoundingRect();
    if (!boundingRect) return { left: currentX, top: currentY };

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const quadrants = [
      {
        left: Math.round(currentX) + CURSOR_OFFSET_PX,
        top: Math.round(currentY) + CURSOR_OFFSET_PX,
      },
      {
        left: Math.round(currentX) - boundingRect.width - CURSOR_OFFSET_PX,
        top: Math.round(currentY) + CURSOR_OFFSET_PX,
      },
      {
        left: Math.round(currentX) + CURSOR_OFFSET_PX,
        top: Math.round(currentY) - boundingRect.height - CURSOR_OFFSET_PX,
      },
      {
        left: Math.round(currentX) - boundingRect.width - CURSOR_OFFSET_PX,
        top: Math.round(currentY) - boundingRect.height - CURSOR_OFFSET_PX,
      },
    ];

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
            }}
          >
            {props.text}
          </span>
        </Show>
        <Show when={props.variant === "success"}>
          <div style={{ "margin-left": "4px" }}>to clipboard</div>
        </Show>
      </div>
    </Show>
  );
};
