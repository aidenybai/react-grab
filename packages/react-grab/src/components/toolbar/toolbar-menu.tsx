import { Show, For, onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { ContextMenuAction, DropdownAnchor } from "../../types.js";
import {
  DROPDOWN_EDGE_TRANSFORM_ORIGIN,
  TOOLBAR_MENU_MIN_WIDTH_PX,
  Z_INDEX_OVERLAY,
} from "../../constants.js";
import { cn } from "../../utils/cn.js";
import { formatShortcut } from "../../utils/format-shortcut.js";
import { createMenuHighlight } from "../../utils/create-menu-highlight.js";
import { suppressMenuEvent } from "../../utils/suppress-menu-event.js";
import { createAnchoredDropdown } from "../../utils/create-anchored-dropdown.js";
import { registerOverlayDismiss } from "../../utils/register-overlay-dismiss.js";

interface ToolbarMenuProps {
  position: DropdownAnchor | null;
  actions: ContextMenuAction[];
  defaultActionId: string;
  onSetDefaultAction: (actionId: string) => void;
  onDismiss: () => void;
}

export const ToolbarMenu: Component<ToolbarMenuProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  const {
    containerRef: highlightContainerRef,
    highlightRef,
    updateHighlight,
    clearHighlight,
  } = createMenuHighlight();

  const dropdown = createAnchoredDropdown(
    () => containerRef,
    () => props.position,
  );

  const handleActionClick = (action: ContextMenuAction, event: Event) => {
    event.stopPropagation();
    props.onSetDefaultAction(action.id);
    props.onDismiss();
  };

  onMount(() => {
    dropdown.measure();
    const unregisterOverlayDismiss = registerOverlayDismiss({
      isOpen: () => Boolean(props.position),
      onDismiss: props.onDismiss,
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
        data-react-grab-toolbar-menu
        class={cn(
          "fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none will-change-[opacity,transform]",
          dropdown.isAnimatedIn()
            ? "transition-[opacity,transform] duration-220 ease-spring"
            : "transition-[opacity,transform] duration-120 ease-drawer",
        )}
        style={{
          top: `${dropdown.displayPosition().top}px`,
          left: `${dropdown.displayPosition().left}px`,
          "z-index": `${Z_INDEX_OVERLAY}`,
          "pointer-events": dropdown.isAnimatedIn() ? "auto" : "none",
          "transform-origin": DROPDOWN_EDGE_TRANSFORM_ORIGIN[dropdown.lastAnchorEdge()],
          opacity: dropdown.isAnimatedIn() ? "1" : "0",
          transform: dropdown.isAnimatedIn() ? "scale(1)" : "scale(0.92)",
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
          style={{ "min-width": `${TOOLBAR_MENU_MIN_WIDTH_PX}px` }}
        >
          <div ref={highlightContainerRef} class="relative flex flex-col py-1">
            <div
              ref={highlightRef}
              class="pointer-events-none absolute bg-black/5 opacity-0 transition-[top,left,width,height,opacity] duration-75 ease-out"
            />
            <For each={props.actions}>
              {(action) => {
                const isDefault = () => action.id === props.defaultActionId;

                return (
                  <button
                    data-react-grab-ignore-events
                    data-react-grab-menu-item={action.id}
                    class="relative z-1 contain-layout flex items-center justify-between w-full px-2 py-1 cursor-pointer text-left border-none bg-transparent"
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerEnter={(event) => updateHighlight(event.currentTarget)}
                    onPointerLeave={clearHighlight}
                    onClick={(event) => handleActionClick(action, event)}
                  >
                    <span
                      class={cn(
                        "text-[13px] leading-4 font-sans font-medium",
                        isDefault() ? "text-black" : "text-black/60",
                      )}
                    >
                      {action.label}
                    </span>
                    <Show when={action.shortcut}>
                      {(shortcutKey) => (
                        <span class="text-[11px] font-sans text-black/50 ml-4">
                          {formatShortcut(shortcutKey())}
                        </span>
                      )}
                    </Show>
                  </button>
                );
              }}
            </For>
          </div>
        </div>
      </div>
    </Show>
  );
};
