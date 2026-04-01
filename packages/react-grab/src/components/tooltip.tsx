import { createSignal, createEffect, on, onCleanup, Show } from "solid-js";
import type { Component, JSX } from "solid-js";
import { cn } from "../utils/cn.js";
import {
  TOOLTIP_BASE_CLASS,
  TOOLTIP_DELAY_MS,
  TOOLTIP_GRACE_PERIOD_MS,
  Z_INDEX_OVERLAY,
} from "../constants.js";

let lastCloseTimestamp = 0;

const wasTooltipRecentlyVisible = () => {
  return Date.now() - lastCloseTimestamp < TOOLTIP_GRACE_PERIOD_MS;
};

interface TooltipProps {
  visible: boolean;
  position: "top" | "bottom" | "left" | "right";
  children: JSX.Element;
}

export const Tooltip: Component<TooltipProps> = (props) => {
  const [delayedVisible, setDelayedVisible] = createSignal(false);
  const [shouldAnimate, setShouldAnimate] = createSignal(true);
  let delayTimeoutId: ReturnType<typeof setTimeout> | undefined;

  createEffect(
    on(
      () => props.visible,
      (isVisible) => {
        if (delayTimeoutId !== undefined) {
          clearTimeout(delayTimeoutId);
          delayTimeoutId = undefined;
        }

        if (isVisible) {
          if (wasTooltipRecentlyVisible()) {
            setShouldAnimate(false);
            setDelayedVisible(true);
          } else {
            setShouldAnimate(true);
            delayTimeoutId = setTimeout(() => {
              setDelayedVisible(true);
            }, TOOLTIP_DELAY_MS);
          }
        } else {
          if (delayedVisible()) {
            lastCloseTimestamp = Date.now();
          }
          setDelayedVisible(false);
        }
      },
    ),
  );

  onCleanup(() => {
    if (delayTimeoutId !== undefined) {
      clearTimeout(delayTimeoutId);
    }
    if (delayedVisible()) {
      lastCloseTimestamp = Date.now();
    }
  });

  return (
    <Show when={delayedVisible()}>
      <div
        class={cn(
          TOOLTIP_BASE_CLASS,
          "bg-white",
          props.position === "left" || props.position === "right"
            ? "top-1/2 -translate-y-1/2"
            : "left-1/2 -translate-x-1/2",
          props.position === "top" && "bottom-full mb-2.5",
          props.position === "bottom" && "top-full mt-2.5",
          props.position === "left" && "right-full mr-2.5",
          props.position === "right" && "left-full ml-2.5",
          shouldAnimate() && "animate-tooltip-fade-in",
        )}
        style={{ "z-index": `${Z_INDEX_OVERLAY}` }}
      >
        {props.children}
      </div>
    </Show>
  );
};
