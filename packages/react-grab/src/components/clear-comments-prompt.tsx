import { Show, onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { DropdownAnchor } from "../types.js";
import { DROPDOWN_EDGE_TRANSFORM_ORIGIN, Z_INDEX_LABEL } from "../constants.js";
import { cn } from "../utils/cn.js";
import { DiscardPrompt } from "./selection-label/discard-prompt.js";
import { suppressMenuEvent } from "../utils/suppress-menu-event.js";
import { createAnchoredDropdown } from "../utils/create-anchored-dropdown.js";
import { registerOverlayDismiss } from "../utils/register-overlay-dismiss.js";

interface ClearCommentsPromptProps {
  position: DropdownAnchor | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ClearCommentsPrompt: Component<ClearCommentsPromptProps> = (
  props,
) => {
  let containerRef: HTMLDivElement | undefined;

  const dropdown = createAnchoredDropdown(
    () => containerRef,
    () => props.position,
  );

  onMount(() => {
    dropdown.measure();
    const unregisterOverlayDismiss = registerOverlayDismiss({
      isOpen: () => Boolean(props.position),
      onDismiss: props.onCancel,
      onConfirm: props.onConfirm,
      shouldIgnoreInputEvents: true,
    });

    onCleanup(() => {
      dropdown.clearAnimationHandles();
      unregisterOverlayDismiss();
    });
  });

  return (
    <Show when={dropdown.shouldMount()}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        data-react-grab-clear-comments-prompt
        class="fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none transition-[opacity,transform] duration-100 ease-out will-change-[opacity,transform]"
        style={{
          top: `${dropdown.displayPosition().top}px`,
          left: `${dropdown.displayPosition().left}px`,
          "z-index": `${Z_INDEX_LABEL}`,
          "pointer-events": dropdown.isAnimatedIn() ? "auto" : "none",
          "transform-origin":
            DROPDOWN_EDGE_TRANSFORM_ORIGIN[dropdown.lastAnchorEdge()],
          opacity: dropdown.isAnimatedIn() ? "1" : "0",
          transform: dropdown.isAnimatedIn() ? "scale(1)" : "scale(0.95)",
        }}
        onPointerDown={suppressMenuEvent}
        onMouseDown={suppressMenuEvent}
        onClick={suppressMenuEvent}
        onContextMenu={suppressMenuEvent}
      >
        <div
          class={cn(
            "contain-layout flex flex-col rounded-[10px] antialiased w-fit h-fit [font-synthesis:none] [corner-shape:superellipse(1.25)]",
            "bg-white",
          )}
        >
          <DiscardPrompt
            label="Clear comments?"
            cancelOnEscape
            onConfirm={props.onConfirm}
            onCancel={props.onCancel}
          />
        </div>
      </div>
    </Show>
  );
};
