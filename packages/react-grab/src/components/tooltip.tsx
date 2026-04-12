import { createSignal, createEffect, on, onCleanup, Show } from "solid-js";
import type { Component, JSX } from "solid-js";
import { cn } from "../utils/cn.js";
import { TOOLTIP_DELAY_MS, TOOLTIP_GRACE_PERIOD_MS, Z_INDEX_OVERLAY } from "../constants.js";

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

  const positionStyle = (): Record<string, string> => {
    const isHorizontal = props.position === "top" || props.position === "bottom";
    if (isHorizontal) {
      return { left: "50%", translate: "-50%", "z-index": `${Z_INDEX_OVERLAY}` };
    }
    return { top: "50%", translate: "0 -50%", "z-index": `${Z_INDEX_OVERLAY}` };
  };

  return (
    <Show when={delayedVisible()}>
      <div
        class={cn(
          "absolute whitespace-nowrap px-2 py-1 rounded-[10px] text-[10px] text-white/80 pointer-events-none [corner-shape:superellipse(1.25)]",
          "bg-black",
          props.position === "top" && "bottom-full mb-2.5",
          props.position === "bottom" && "top-full mt-2.5",
          props.position === "left" && "right-full mr-2.5",
          props.position === "right" && "left-full ml-2.5",
          shouldAnimate() && "animate-tooltip-fade-in",
        )}
        style={positionStyle()}
      >
        {props.children}
      </div>
    </Show>
  );
};
