import { Show, createSignal, createEffect, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import { SELECTION_CURSOR_SETTLE_DELAY_MS } from "../constants.js";
import type { OverlayBounds } from "../types.js";
import { SelectionBox } from "./selection-box.js";
import { SelectionLabel } from "./selection-label.js";
import { cn } from "../utils/cn.js";

interface SelectionCursorProps {
  x: number;
  y: number;
  tagName?: string;
  componentName?: string;
  elementBounds?: OverlayBounds;
  visible?: boolean;
  onClick?: () => void;
  onEnter?: () => void;
}

export const SelectionCursor: Component<SelectionCursorProps> = (props) => {
  const [isHovered, setIsHovered] = createSignal(false);
  const [debouncedVisible, setDebouncedVisible] = createSignal(false);

  createEffect(() => {
    const isVisible = props.visible !== false;
    void [props.x, props.y];

    setDebouncedVisible(false);

    if (isVisible) {
      const timeout = setTimeout(() => setDebouncedVisible(true), SELECTION_CURSOR_SETTLE_DELAY_MS);
      onCleanup(() => clearTimeout(timeout));
    }
  });

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    props.onClick?.();
  };

  return (
    <Show when={debouncedVisible()}>
      <Show when={isHovered() && props.elementBounds}>
        <SelectionBox
          variant="selection"
          bounds={props.elementBounds!}
          visible={true}
        />
      </Show>

      <div
        class="fixed z-2147483647"
        style={{
          left: `${props.x}px`,
          top: `${props.y}px`,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          class={cn(
            "absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 bg-grab-pink cursor-pointer rounded-full transition-[width,height] duration-150",
            isHovered() ? "w-1 h-5.5 brightness-125" : "w-0.5 h-5 animate-pulse"
          )}
          onClick={handleClick}
          data-react-grab-selection-cursor
        />
      </div>

      <Show when={isHovered() && props.elementBounds}>
        <SelectionLabel
          tagName={props.tagName}
          selectionBounds={props.elementBounds}
          mouseX={props.x}
          visible={true}
          onSubmit={props.onClick}
        />
      </Show>
    </Show>
  );
};
