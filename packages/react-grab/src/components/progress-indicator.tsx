import { Show, createSignal, createEffect, on } from "solid-js";
import type { Component } from "solid-js";
import {
  VIEWPORT_MARGIN_PX,
  CURSOR_OFFSET_PX,
} from "./overlay-constants.js";
import { getClampedElementPosition } from "../utils/get-clamped-element-position.js";

interface ProgressIndicatorProps {
  progress: number;
  mouseX: number;
  mouseY: number;
  visible?: boolean;
}

const useFadeInOut = (visible: boolean | undefined) => {
  const [opacity, setOpacity] = createSignal(0);

  createEffect(
    on(
      () => visible,
      (isVisible) => {
        if (isVisible !== false) {
          requestAnimationFrame(() => {
            setOpacity(1);
          });
        } else {
          setOpacity(0);
        }
      },
    ),
  );

  return opacity;
};

export const ProgressIndicator: Component<ProgressIndicatorProps> = (props) => {
  const opacity = useFadeInOut(props.visible);
  let progressIndicatorRef: HTMLDivElement | undefined;

  const computedPosition = () => {
    const boundingRect = progressIndicatorRef?.getBoundingClientRect();
    if (!boundingRect) return { left: props.mouseX, top: props.mouseY };

    const viewportHeight = window.innerHeight;

    const indicatorLeft = props.mouseX - boundingRect.width / 2;
    const indicatorTop =
      props.mouseY +
        CURSOR_OFFSET_PX +
        boundingRect.height +
        VIEWPORT_MARGIN_PX >
      viewportHeight
        ? props.mouseY - boundingRect.height - CURSOR_OFFSET_PX
        : props.mouseY + CURSOR_OFFSET_PX;

    return getClampedElementPosition(
      indicatorLeft,
      indicatorTop,
      boundingRect.width,
      boundingRect.height,
    );
  };

  return (
    <Show when={props.visible !== false}>
      <div
        ref={progressIndicatorRef}
        style={{
          position: "fixed",
          top: `${computedPosition().top}px`,
          left: `${computedPosition().left}px`,
          "z-index": "2147483647",
          "pointer-events": "none",
          opacity: opacity(),
          transition: "opacity 0.1s ease-in-out",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "2px",
            "background-color": "rgba(178, 28, 142, 0.2)",
            "border-radius": "1px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, props.progress * 100))}%`,
              height: "100%",
              "background-color": "#b21c8e",
              "border-radius": "1px",
              transition: "width 0.05s cubic-bezier(0.165, 0.84, 0.44, 1)",
            }}
          />
        </div>
      </div>
    </Show>
  );
};
