import { createSignal, createEffect, on, onCleanup, Show } from "solid-js";
import type { Component, JSX } from "solid-js";
import { cn } from "../utils/cn.js";
import {
  TOOLTIP_DELAY_MS,
  TOOLTIP_GRACE_PERIOD_MS,
  PANEL_STYLES,
} from "../constants.js";

let tooltipCloseTimestamp = 0;

const wasTooltipRecentlyVisible = () => {
  return Date.now() - tooltipCloseTimestamp < TOOLTIP_GRACE_PERIOD_MS;
};

interface TooltipProps {
  visible: boolean;
  position: "top" | "bottom";
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
            tooltipCloseTimestamp = Date.now();
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
      tooltipCloseTimestamp = Date.now();
    }
  });

  return (
    <Show when={delayedVisible()}>
      <div
        class={cn(
          "absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded-[10px] text-[10px] text-black/60 pointer-events-none [corner-shape:superellipse(1.25)]",
          PANEL_STYLES,
          props.position === "top" ? "bottom-full mb-2.5" : "top-full mt-2.5",
          shouldAnimate() && "animate-tooltip-fade-in",
        )}
        style={{ "z-index": "2147483647" }}
      >
        {props.children}
      </div>
    </Show>
  );
};
