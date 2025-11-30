import { Show, createSignal, createEffect, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { OverlayBounds } from "../types.js";
import { SelectionBox } from "./selection-box.js";

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

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    props.onClick?.();
  };

  createEffect(() => {
    if (!isHovered()) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && isHovered()) {
        event.preventDefault();
        event.stopPropagation();
        props.onEnter?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown, { capture: true }));
  });

  return (
    <Show when={props.visible !== false}>
      <Show when={isHovered() && props.elementBounds}>
        <SelectionBox
          variant="selection"
          bounds={props.elementBounds!}
          visible={true}
        />
      </Show>
      <div
        class="fixed z-[2147483647] group"
        style={{
          left: `${props.x}px`,
          top: `${props.y}px`,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          class="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-0.5 h-5 bg-grab-pink cursor-pointer group-hover:w-1 group-hover:h-5.5 group-hover:animate-none group-hover:brightness-125 rounded-full animate-pulse transition-[width,height] duration-150"
          onClick={handleClick}
          data-react-grab-selection-cursor
        />
        <div class="absolute left-0 top-3 -translate-x-1/2 px-1.5 py-0.5 rounded text-[11px] font-medium font-sans bg-grab-pink-light text-grab-pink border border-grab-pink-border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
          <span class="mr-1">Copy</span>
          <Show when={props.tagName}>
            <span class="font-mono">{"<"}{props.tagName}{">"}</span>
          </Show>
          <Show when={!props.tagName}>
            <span>element</span>
          </Show>
          <Show when={props.componentName}>
            <span class="text-[10px] ml-1 opacity-80">in {props.componentName}</span>
          </Show>
        </div>
      </div>
    </Show>
  );
};
