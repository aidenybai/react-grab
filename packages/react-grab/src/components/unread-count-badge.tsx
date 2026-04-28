import { createMemo, createEffect, on, Index } from "solid-js";
import type { Component } from "solid-js";
import { cn } from "../utils/cn.js";

interface UnreadCountBadgeProps {
  value: number;
  class?: string;
}

interface DigitDescriptor {
  char: string;
  staggerIndex: number | null;
}

const buildDigitDescriptors = (value: string): DigitDescriptor[] => {
  const characters = value.split("");
  const lastIndex = characters.length - 1;
  return characters.map((char, characterIndex) => {
    if (characterIndex === lastIndex - 1) {
      return { char, staggerIndex: 1 };
    }
    if (characterIndex === lastIndex) {
      return { char, staggerIndex: 2 };
    }
    return { char, staggerIndex: null };
  });
};

export const UnreadCountBadge: Component<UnreadCountBadgeProps> = (props) => {
  let groupRef: HTMLSpanElement | undefined;

  const isOpen = () => props.value > 0;
  const displayValue = () => String(Math.max(0, props.value));
  const digits = createMemo(() => buildDigitDescriptors(displayValue()));

  createEffect(
    on(
      () => props.value,
      () => {
        if (!groupRef) return;
        if (props.value <= 0) return;
        groupRef.classList.remove("is-animating");
        void groupRef.offsetHeight;
        groupRef.classList.add("is-animating");
      },
      { defer: true },
    ),
  );

  return (
    <span
      data-react-grab-unread-indicator
      class={cn("rg-t-badge absolute -top-1 -right-1", props.class)}
      data-open={isOpen() ? "true" : "false"}
    >
      <span class="rg-t-badge-dot min-w-2.5 h-2.5 px-0.5 flex items-center justify-center rounded-full bg-black text-white text-[8px] font-semibold leading-none">
        <span ref={groupRef} class="rg-t-digit-group inline-flex items-baseline is-animating">
          <Index each={digits()}>
            {(descriptor) => (
              <span
                class="rg-t-digit"
                data-stagger={
                  descriptor().staggerIndex !== null
                    ? String(descriptor().staggerIndex)
                    : undefined
                }
              >
                {descriptor().char}
              </span>
            )}
          </Index>
        </span>
      </span>
    </span>
  );
};
