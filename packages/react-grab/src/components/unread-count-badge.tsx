import { createSignal, createEffect, on } from "solid-js";
import type { Component } from "solid-js";
import { cn } from "../utils/cn.js";

interface UnreadCountBadgeProps {
  value: number;
  class?: string;
}

type Slot = "a" | "b";

export const UnreadCountBadge: Component<UnreadCountBadgeProps> = (props) => {
  const isOpen = () => props.value > 0;
  const initialDisplay = String(Math.max(0, props.value));
  const [activeSlot, setActiveSlot] = createSignal<Slot>("a");
  const [valueA, setValueA] = createSignal(initialDisplay);
  const [valueB, setValueB] = createSignal(initialDisplay);

  createEffect(
    on(
      () => props.value,
      (current) => {
        if (current <= 0) return;
        const nextDisplay = String(current);
        const incomingSlot: Slot = activeSlot() === "a" ? "b" : "a";
        if (incomingSlot === "a") setValueA(nextDisplay);
        else setValueB(nextDisplay);
        setActiveSlot(incomingSlot);
      },
      { defer: true },
    ),
  );

  return (
    <span
      data-react-grab-unread-indicator
      data-open={isOpen() ? "true" : "false"}
      data-state={activeSlot()}
      class={cn(
        "group/badge absolute -top-1 -right-1 pointer-events-none will-change-transform",
        "data-[open=true]:animate-rg-badge-slide",
        props.class,
      )}
    >
      <span
        class={cn(
          "block min-w-2.5 h-2.5 px-0.5 rounded-full bg-black origin-center",
          "will-change-[transform,opacity,filter] transition-[transform,opacity,filter]",
          "scale-100 opacity-100 blur-0 ease-badge-pop [transition-duration:500ms,400ms,500ms]",
          "group-data-[open=false]/badge:scale-0",
          "group-data-[open=false]/badge:opacity-0",
          "group-data-[open=false]/badge:blur-[2px]",
          "group-data-[open=false]/badge:ease-badge-close",
          "group-data-[open=false]/badge:[transition-duration:180ms,180ms,180ms]",
        )}
      >
        <span class="relative grid place-items-center w-full h-full text-white text-[8px] font-semibold leading-none tabular-nums">
          <span
            class={cn(
              "[grid-area:1/1] transition-[transform,opacity,filter] duration-200 ease-text-swap will-change-[transform,opacity,filter]",
              "group-data-[state=a]/badge:translate-y-0",
              "group-data-[state=a]/badge:opacity-100",
              "group-data-[state=a]/badge:blur-0",
              "group-data-[state=b]/badge:-translate-y-2",
              "group-data-[state=b]/badge:opacity-0",
              "group-data-[state=b]/badge:blur-[2px]",
            )}
          >
            {valueA()}
          </span>
          <span
            class={cn(
              "[grid-area:1/1] transition-[transform,opacity,filter] duration-200 ease-text-swap will-change-[transform,opacity,filter]",
              "group-data-[state=b]/badge:translate-y-0",
              "group-data-[state=b]/badge:opacity-100",
              "group-data-[state=b]/badge:blur-0",
              "group-data-[state=a]/badge:translate-y-2",
              "group-data-[state=a]/badge:opacity-0",
              "group-data-[state=a]/badge:blur-[2px]",
            )}
          >
            {valueB()}
          </span>
        </span>
      </span>
    </span>
  );
};
