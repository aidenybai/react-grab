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
        event.preventDefault();
        event.stopPropagation();
        props.onCopyAll?.();
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
                  class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-[#FEF2F2] cursor-pointer transition-all hover:bg-[#FEE2E2] press-scale h-[17px]"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onClearAll?.();
                  }}
                >
                  <span class="text-[#B91C1C] text-[13px] leading-3.5 font-sans font-medium">
                    Clear
                  </span>
                </button>
                <button
                  data-react-grab-ignore-events
                  data-react-grab-recent-copy-all
                  class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px]"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onCopyAll?.();
                  }}
                >
                  <span class="text-black text-[13px] leading-3.5 font-sans font-medium">
                    Copy all
                  </span>
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
                  <button
                    data-react-grab-ignore-events
                    data-react-grab-recent-item
                    class="contain-layout flex items-start justify-between w-full px-2 py-1 cursor-pointer transition-colors hover:bg-black/5 text-left border-none bg-transparent gap-2"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onSelectItem?.(item);
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
                    <span class="text-[10px] font-sans text-black/25 shrink-0 mt-0.5">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
