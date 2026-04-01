import { Show, onMount, onCleanup, createEffect, on } from "solid-js";
import type { Component } from "solid-js";
import type {
  DropdownAnchor,
  ToolbarEntry,
  ToolbarEntryHandle,
} from "../../types.js";
import {
  DROPDOWN_EDGE_TRANSFORM_ORIGIN,
  Z_INDEX_LABEL,
} from "../../constants.js";
import { cn } from "../../utils/cn.js";
import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";
import { createAnchoredDropdown } from "../../utils/create-anchored-dropdown.js";
import { registerOverlayDismiss } from "../../utils/register-overlay-dismiss.js";

interface ToolbarEntryContainerProps {
  position: DropdownAnchor | null;
  entry: ToolbarEntry | null;
  handle: ToolbarEntryHandle | null;
  onDismiss: () => void;
}

export const ToolbarEntryContainer: Component<ToolbarEntryContainerProps> = (
  props,
) => {
  let containerRef: HTMLDivElement | undefined;
  let contentRef: HTMLDivElement | undefined;

  const dropdown = createAnchoredDropdown(
    () => containerRef,
    () => props.position,
  );

  createEffect(
    on(
      () => ({
        entry: props.entry,
        isAnimatedIn: dropdown.isAnimatedIn(),
      }),
      ({ entry, isAnimatedIn }) => {
        const handle = props.handle;
        if (!entry?.onRender || !handle || !isAnimatedIn || !contentRef) return;
        contentRef.innerHTML = "";
        const cleanup = entry.onRender(contentRef, handle);
        dropdown.measure();
        if (cleanup) {
          onCleanup(cleanup);
        }
      },
    ),
  );

  onMount(() => {
    dropdown.measure();
    const unregisterDismiss = registerOverlayDismiss({
      isOpen: () => Boolean(props.position),
      onDismiss: props.onDismiss,
    });
    onCleanup(() => {
      dropdown.clearAnimationHandles();
      unregisterDismiss();
    });
  });

  return (
    <Show when={dropdown.shouldMount()}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        data-react-grab-toolbar-entry-container
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
            "contain-layout flex flex-col rounded-[10px] antialiased w-fit h-fit overflow-hidden [font-synthesis:none] [corner-shape:superellipse(1.25)]",
            "bg-white",
          )}
        >
          <div ref={contentRef} />
        </div>
      </div>
    </Show>
  );
};
