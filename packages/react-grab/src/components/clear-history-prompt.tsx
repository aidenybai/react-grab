import { Show, onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { DropdownAnchor } from "../types.js";
import { DROPDOWN_EDGE_TRANSFORM_ORIGIN, Z_INDEX_LABEL } from "../constants.js";
import { cn } from "../utils/cn.js";
import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import { isKeyboardEventTriggeredByInput } from "../utils/is-keyboard-event-triggered-by-input.js";
import { DiscardPrompt } from "./selection-label/discard-prompt.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../utils/native-raf.js";
import { suppressMenuEvent } from "../utils/suppress-menu-event.js";
import { createAnchoredDropdown } from "../utils/create-anchored-dropdown.js";

interface ClearHistoryPromptProps {
  position: DropdownAnchor | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ClearHistoryPrompt: Component<ClearHistoryPromptProps> = (
  props,
) => {
  let containerRef: HTMLDivElement | undefined;

  const dropdown = createAnchoredDropdown(
    () => containerRef,
    () => props.position,
  );

  onMount(() => {
    dropdown.measure();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!props.position) return;
      if (isKeyboardEventTriggeredByInput(event)) return;
      const isEnter = event.code === "Enter";
      const isEscape = event.code === "Escape";
      if (isEnter || isEscape) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (isEscape) {
          props.onCancel();
        } else {
          props.onConfirm();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        !props.position ||
        isEventFromOverlay(event, "data-react-grab-ignore-events")
      )
        return;
      props.onCancel();
    };

    // HACK: Delay mousedown listener to avoid catching the triggering click
    const frameId = nativeRequestAnimationFrame(() => {
      window.addEventListener("mousedown", handleClickOutside, {
        capture: true,
      });
      window.addEventListener("touchstart", handleClickOutside, {
        capture: true,
      });
    });

    onCleanup(() => {
      nativeCancelAnimationFrame(frameId);
      dropdown.clearAnimationHandles();
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("mousedown", handleClickOutside, {
        capture: true,
      });
      window.removeEventListener("touchstart", handleClickOutside, {
        capture: true,
      });
    });
  });

  return (
    <Show when={dropdown.shouldMount()}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        data-react-grab-clear-history-prompt
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
            label="Clear history?"
            cancelOnEscape
            onConfirm={props.onConfirm}
            onCancel={props.onCancel}
          />
        </div>
      </div>
    </Show>
  );
};
