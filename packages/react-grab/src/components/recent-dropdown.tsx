import {
  Show,
  For,
  onMount,
  onCleanup,
  createSignal,
  createEffect,
} from "solid-js";
import type { Component } from "solid-js";
import type { RecentItem } from "../types.js";
import {
  DROPDOWN_ANCHOR_GAP_PX,
  DROPDOWN_VIEWPORT_PADDING_PX,
  PANEL_STYLES,
} from "../constants.js";
import { cn } from "../utils/cn.js";
import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import { IconComment } from "./icons/icon-comment.jsx";
import { IconCopy } from "./icons/icon-copy.jsx";
import { IconTrash } from "./icons/icon-trash.jsx";

const DEFAULT_OFFSCREEN_POSITION = { left: -9999, top: -9999 };

interface RecentDropdownProps {
  position: { x: number; y: number } | null;
  items: RecentItem[];
  onSelectItem?: (item: RecentItem) => void;
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
  let lastHoveredRecentItemId: string | null = null;

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [highlightedRecentItemIndex, setHighlightedRecentItemIndex] =
    createSignal<number | null>(null);

  const isVisible = () => props.position !== null;

  const measureContainer = () => {
    if (containerRef) {
      const rect = containerRef.getBoundingClientRect();
      setMeasuredWidth(rect.width);
      setMeasuredHeight(rect.height);
    }
  };

  createEffect(() => {
    if (isVisible()) {
      requestAnimationFrame(measureContainer);
    }
  });

  const computedPosition = () => {
    const anchorPosition = props.position;
    const dropdownWidth = measuredWidth();
    const dropdownHeight = measuredHeight();

    if (!anchorPosition || dropdownWidth === 0 || dropdownHeight === 0) {
      return DEFAULT_OFFSCREEN_POSITION;
    }

    let left = anchorPosition.x - dropdownWidth / 2;
    left = Math.max(
      DROPDOWN_VIEWPORT_PADDING_PX,
      Math.min(
        left,
        window.innerWidth - dropdownWidth - DROPDOWN_VIEWPORT_PADDING_PX,
      ),
    );

    const wouldOverflowTop =
      anchorPosition.y - dropdownHeight - DROPDOWN_ANCHOR_GAP_PX < 0;
    const top = wouldOverflowTop
      ? anchorPosition.y + DROPDOWN_ANCHOR_GAP_PX
      : anchorPosition.y - dropdownHeight - DROPDOWN_ANCHOR_GAP_PX;

    return { left, top };
  };

  const handleMenuEvent = (event: Event) => {
    if (event.type === "contextmenu") {
      event.preventDefault();
    }
    event.stopImmediatePropagation();
  };

  const notifyRecentItemHover = (recentItemId: string | null) => {
    if (recentItemId === lastHoveredRecentItemId) return;
    lastHoveredRecentItemId = recentItemId;
    props.onItemHover?.(recentItemId);
  };

  const setHighlightedRecentItem = (
    nextHighlightedIndex: number | null,
    shouldSyncHover: boolean,
  ) => {
    setHighlightedRecentItemIndex(nextHighlightedIndex);

    if (shouldSyncHover) {
      if (nextHighlightedIndex === null) {
        notifyRecentItemHover(null);
        return;
      }

      const highlightedRecentItem = props.items[nextHighlightedIndex] ?? null;
      notifyRecentItemHover(highlightedRecentItem?.id ?? null);

      requestAnimationFrame(() => {
        const highlightedItemButton = containerRef?.querySelectorAll<
          HTMLButtonElement
        >("[data-react-grab-recent-item]")[nextHighlightedIndex];
        highlightedItemButton?.scrollIntoView({
          block: "nearest",
        });
      });
    }
  };

  const moveHighlightedRecentItem = (direction: "forward" | "backward") => {
    const totalRecentItems = props.items.length;
    if (totalRecentItems === 0) return;

    const currentHighlightedIndex = highlightedRecentItemIndex();

    let nextHighlightedIndex = 0;
    if (
      currentHighlightedIndex === null ||
      currentHighlightedIndex >= totalRecentItems
    ) {
      nextHighlightedIndex = direction === "forward" ? 0 : totalRecentItems - 1;
    } else if (direction === "forward") {
      nextHighlightedIndex =
        currentHighlightedIndex + 1 >= totalRecentItems
          ? 0
          : currentHighlightedIndex + 1;
    } else {
      nextHighlightedIndex =
        currentHighlightedIndex - 1 < 0
          ? totalRecentItems - 1
          : currentHighlightedIndex - 1;
    }

    setHighlightedRecentItem(nextHighlightedIndex, true);
  };

  const selectHighlightedRecentItem = () => {
    if (props.items.length === 0) return;

    const currentHighlightedIndex = highlightedRecentItemIndex();
    const selectedRecentItem =
      currentHighlightedIndex === null ||
      currentHighlightedIndex >= props.items.length
        ? props.items[0]
        : props.items[currentHighlightedIndex];

    if (!selectedRecentItem) return;
    props.onSelectItem?.(selectedRecentItem);
  };

  const isRecentItemHighlighted = (recentItemId: string): boolean => {
    const currentHighlightedIndex = highlightedRecentItemIndex();
    if (currentHighlightedIndex === null) return false;
    return props.items[currentHighlightedIndex]?.id === recentItemId;
  };

  const isBottomRecentItem = (recentItemIndex: number): boolean => {
    return recentItemIndex === props.items.length - 1;
  };

  createEffect(() => {
    const currentItems = props.items;
    if (!isVisible() || currentItems.length === 0) {
      setHighlightedRecentItem(null, true);
      return;
    }

    const currentHighlightedIndex = highlightedRecentItemIndex();
    if (
      currentHighlightedIndex === null ||
      currentHighlightedIndex >= currentItems.length
    ) {
      setHighlightedRecentItem(0, false);
      return;
    }
  });

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
        event.stopImmediatePropagation();
        props.onDismiss?.();
        return;
      }

      if (event.code === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        moveHighlightedRecentItem("forward");
        return;
      }

      if (event.code === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        moveHighlightedRecentItem("backward");
        return;
      }

      if (event.code === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        selectHighlightedRecentItem();
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
                  aria-label="Clear all"
                  class="contain-layout shrink-0 flex items-center justify-center w-[18px] h-[18px] rounded-sm bg-[#FEF2F2] border-none cursor-pointer transition-all hover:bg-black/[0.02] press-scale"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onClearAll?.();
                  }}
                >
                  <IconTrash size={12} class="text-[#B91C1C]" />
                </button>
                <button
                  data-react-grab-ignore-events
                  data-react-grab-recent-copy-all
                  aria-label="Copy all"
                  class="contain-layout shrink-0 flex items-center justify-center w-[18px] h-[18px] rounded-sm bg-white border-none cursor-pointer transition-all hover:bg-black/[0.02] press-scale"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onCopyAll?.();
                  }}
                >
                  <IconCopy size={12} class="text-black" />
                </button>
              </div>
            </Show>
          </div>

          <div class="px-2 py-1.5">
            <Show
              when={props.items.length > 0}
              fallback={
                <div class="py-1.5 text-center text-[12px] text-black/30">
                  No copied elements yet
                </div>
              }
            >
              <div
                class="flex flex-col max-h-[240px] overflow-y-auto -mx-2 -my-1.5"
                style={{ "scrollbar-color": "rgba(0,0,0,0.15) transparent" }}
              >
                <For each={props.items}>
                  {(item, itemIndex) => (
                    <button
                      data-react-grab-ignore-events
                      data-react-grab-recent-item
                      data-react-grab-recent-item-highlighted={
                        isRecentItemHighlighted(item.id) ? "" : undefined
                      }
                      class="contain-layout flex items-start justify-between w-full px-2 py-1 cursor-pointer transition-colors duration-150 text-left border border-transparent hover:bg-black/[0.02] hover:border-black/[0.05] gap-2"
                      classList={{
                        "bg-black/[0.02] border-black/[0.05]":
                          isRecentItemHighlighted(item.id),
                        "rounded-none": !isBottomRecentItem(itemIndex()),
                        "rounded-b-[6px]": isBottomRecentItem(itemIndex()),
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onSelectItem?.(item);
                      }}
                      onMouseEnter={() => setHighlightedRecentItem(itemIndex(), true)}
                      onMouseLeave={() => setHighlightedRecentItem(null, true)}
                    >
                      <span class="flex flex-col min-w-0 flex-1">
                        <span class="flex items-center gap-1 text-[12px] leading-4 font-sans font-medium text-black truncate">
                          <Show when={item.isComment}>
                            <IconComment
                              size={12}
                              class="text-black/40 shrink-0"
                            />
                          </Show>
                          <span class="truncate min-w-0">
                            <Show
                              when={item.componentName}
                              fallback={item.tagName}
                            >
                              {item.componentName}
                              <span class="text-black/50">.{item.tagName}</span>
                            </Show>
                          </span>
                        </span>
                        <Show when={item.commentText}>
                          <span class="text-[11px] leading-3 font-sans text-black/40 truncate mt-0.5 pl-4">
                            {item.commentText}
                          </span>
                        </Show>
                      </span>
                      <span class="text-[10px] font-sans text-black/25 shrink-0 mt-0.5">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};
