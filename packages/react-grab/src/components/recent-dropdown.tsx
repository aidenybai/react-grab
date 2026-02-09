import {
  Show,
  For,
  onMount,
  onCleanup,
  createSignal,
  createEffect,
} from "solid-js";
import type { Component } from "solid-js";
import type { RecentItem, DropdownAnchor } from "../types.js";
import {
  DROPDOWN_ANCHOR_GAP_PX,
  DROPDOWN_ICON_SIZE_PX,
  DROPDOWN_VIEWPORT_PADDING_PX,
  PANEL_STYLES,
} from "../constants.js";
import { clampToViewport } from "../utils/clamp-to-viewport.js";
import { cn } from "../utils/cn.js";
import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import { IconTrash } from "./icons/icon-trash.jsx";
import { IconCopy } from "./icons/icon-copy.jsx";

const DEFAULT_OFFSCREEN_POSITION = { left: -9999, top: -9999 };
const ITEM_ACTION_CLASS =
  "flex items-center justify-center cursor-pointer text-black/25 transition-colors press-scale";

interface RecentDropdownProps {
  position: DropdownAnchor | null;
  items: RecentItem[];
  onSelectItem?: (item: RecentItem) => void;
  onRemoveItem?: (item: RecentItem) => void;
  onCopyItem?: (item: RecentItem) => void;
  onItemHover?: (recentItemId: string | null) => void;
  onCopyAll?: () => void;
  onClearAll?: () => void;
  onDismiss?: () => void;
}

const formatRelativeTime = (timestamp: number): string => {
  const elapsedSeconds = Math.floor((Date.now() - timestamp) / 1000);
  if (elapsedSeconds < 60) return "now";
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h`;
  return `${Math.floor(elapsedHours / 24)}d`;
};

export const RecentDropdown: Component<RecentDropdownProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);

  const isVisible = () => props.position !== null;

  const measureContainer = () => {
    if (containerRef) {
      const rect = containerRef.getBoundingClientRect();
      setMeasuredWidth(rect.width);
      setMeasuredHeight(rect.height);
    }
  };

  createEffect(() => {
    props.items.length;
    requestAnimationFrame(measureContainer);
  });

  const computedPosition = () => {
    const anchor = props.position;
    const width = measuredWidth();
    const height = measuredHeight();

    if (!anchor || width === 0 || height === 0) {
      return DEFAULT_OFFSCREEN_POSITION;
    }

    const { edge } = anchor;
    const isHorizontalEdge = edge === "left" || edge === "right";

    const rawLeft = isHorizontalEdge
      ? edge === "left"
        ? anchor.x + DROPDOWN_ANCHOR_GAP_PX
        : anchor.x - width - DROPDOWN_ANCHOR_GAP_PX
      : anchor.x - width / 2;

    const rawTop = isHorizontalEdge
      ? anchor.y - height / 2
      : edge === "top"
        ? anchor.y + DROPDOWN_ANCHOR_GAP_PX
        : anchor.y - height - DROPDOWN_ANCHOR_GAP_PX;

    return {
      left: clampToViewport(rawLeft, width, window.innerWidth, DROPDOWN_VIEWPORT_PADDING_PX),
      top: clampToViewport(rawTop, height, window.innerHeight, DROPDOWN_VIEWPORT_PADDING_PX),
    };
  };

  const handleMenuEvent = (event: Event) => {
    if (event.type === "contextmenu") {
      event.preventDefault();
    }
    event.stopImmediatePropagation();
  };

  onMount(() => {
    measureContainer();

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        !isVisible() ||
        isEventFromOverlay(event, "data-react-grab-ignore-events")
      )
        return;
      if (event instanceof MouseEvent && event.button === 2) return;
      props.onDismiss?.();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible()) return;
      if (event.code === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        props.onDismiss?.();
      }
      if (event.code === "Enter" && props.items.length > 0) {
        const target = event.target as Element;
        const isWithinDropdown = target.closest(
          "[data-react-grab-recent-dropdown]",
        );
        if (!isWithinDropdown) {
          event.preventDefault();
          event.stopPropagation();
          props.onCopyAll?.();
        }
      }
    };

    // HACK: Delay mousedown/touchstart listener to avoid catching the triggering click
    const frameId = requestAnimationFrame(() => {
      window.addEventListener("mousedown", handleClickOutside, {
        capture: true,
      });
      window.addEventListener("touchstart", handleClickOutside, {
        capture: true,
      });
    });
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    onCleanup(() => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousedown", handleClickOutside, {
        capture: true,
      });
      window.removeEventListener("touchstart", handleClickOutside, {
        capture: true,
      });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    });
  });

  return (
    <Show when={isVisible()}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        data-react-grab-recent-dropdown
        class="fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none transition-opacity duration-150 ease-out"
        style={{
          top: `${computedPosition().top}px`,
          left: `${computedPosition().left}px`,
          "z-index": "2147483647",
          "pointer-events": "auto",
        }}
        onPointerDown={handleMenuEvent}
        onMouseDown={handleMenuEvent}
        onClick={handleMenuEvent}
        onContextMenu={handleMenuEvent}
      >
        <div
          class={cn(
            "contain-layout flex flex-col rounded-[10px] antialiased w-fit h-fit min-w-[180px] max-w-[280px] [font-synthesis:none] [corner-shape:superellipse(1.25)]",
            PANEL_STYLES,
          )}
        >
          <div class="contain-layout shrink-0 flex items-center justify-between px-2 pt-1.5 pb-1">
            <span class="text-[11px] font-medium text-black/40">Recent</span>
            <Show when={props.items.length > 0}>
              <div class="flex items-center gap-[5px]">
                <button
                  data-react-grab-ignore-events
                  data-react-grab-recent-clear
                  class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-[#FEF2F2] cursor-pointer transition-all hover:bg-[#FEE2E2] press-scale h-[17px] text-[#B91C1C]"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onClearAll?.();
                  }}
                >
                  <IconTrash size={DROPDOWN_ICON_SIZE_PX} />
                </button>
                <button
                  data-react-grab-ignore-events
                  data-react-grab-recent-copy-all
                  class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px] text-black/60"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onCopyAll?.();
                  }}
                >
                  <IconCopy size={DROPDOWN_ICON_SIZE_PX} />
                  <span class="text-[11px] font-sans text-black/50">↵</span>
                </button>
              </div>
            </Show>
          </div>

          <div class="[border-top-width:0.5px] border-t-solid border-t-[#D9D9D9] px-2 py-1.5">
            <div
              class="flex flex-col max-h-[240px] overflow-y-auto -mx-2 -my-1.5"
              style={{ "scrollbar-color": "rgba(0,0,0,0.15) transparent" }}
            >
              <For each={props.items}>
                {(item) => (
                  <div
                    data-react-grab-ignore-events
                    data-react-grab-recent-item
                    class="group contain-layout flex items-start justify-between w-full px-2 py-1 cursor-pointer transition-colors hover:bg-black/5 focus-within:bg-black/5 text-left gap-2"
                    tabindex="0"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onSelectItem?.(item);
                    }}
                    onKeyDown={(event) => {
                      if (
                        (event.code === "Enter" || event.code === "Space") &&
                        event.currentTarget === event.target
                      ) {
                        event.preventDefault();
                        event.stopPropagation();
                        props.onSelectItem?.(item);
                      }
                    }}
                    onMouseEnter={() => props.onItemHover?.(item.id)}
                    onMouseLeave={() => props.onItemHover?.(null)}
                  >
                    <span class="flex flex-col min-w-0 flex-1">
                      <span class="text-[12px] leading-4 font-sans font-medium text-black truncate">
                        {item.componentName ?? item.tagName}
                      </span>
                      <Show when={item.commentText}>
                        <span class="text-[11px] leading-3 font-sans text-black/40 truncate mt-0.5">
                          {item.commentText}
                        </span>
                      </Show>
                    </span>
                    <span class="shrink-0 grid mt-0.5">
                      <span class="text-[10px] font-sans text-black/25 group-hover:invisible group-focus-within:invisible [grid-area:1/1] flex items-center justify-end">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                      <span class="invisible group-hover:visible group-focus-within:visible [grid-area:1/1] flex items-center justify-end gap-1.5">
                        <button
                          data-react-grab-ignore-events
                          data-react-grab-recent-item-remove
                          class={cn(ITEM_ACTION_CLASS, "hover:text-[#B91C1C]")}
                          onClick={(event) => {
                            event.stopPropagation();
                            props.onRemoveItem?.(item);
                          }}
                        >
                          <IconTrash size={DROPDOWN_ICON_SIZE_PX} />
                        </button>
                        <button
                          data-react-grab-ignore-events
                          data-react-grab-recent-item-copy
                          class={cn(ITEM_ACTION_CLASS, "hover:text-black/60")}
                          onClick={(event) => {
                            event.stopPropagation();
                            props.onCopyItem?.(item);
                          }}
                        >
                          <IconCopy size={DROPDOWN_ICON_SIZE_PX} />
                        </button>
                      </span>
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
