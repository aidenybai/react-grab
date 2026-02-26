import {
  Show,
  For,
  onMount,
  onCleanup,
  createSignal,
  createEffect,
  createMemo,
  on,
} from "solid-js";
import type { Component } from "solid-js";
import type { HistoryItem, DropdownAnchor } from "../types.js";
import {
  DROPDOWN_ANCHOR_GAP_PX,
  DROPDOWN_ANIMATION_DURATION_MS,
  DROPDOWN_EDGE_TRANSFORM_ORIGIN,
  DROPDOWN_ICON_SIZE_PX,
  DROPDOWN_MAX_WIDTH_PX,
  DROPDOWN_MIN_WIDTH_PX,
  DROPDOWN_OFFSCREEN_POSITION,
  DROPDOWN_VIEWPORT_PADDING_PX,
  FEEDBACK_DURATION_MS,
  SAFE_POLYGON_BUFFER_PX,
  PANEL_STYLES,
} from "../constants.js";
import { createSafePolygonTracker } from "../utils/safe-polygon.js";
import { getAnchoredDropdownPosition } from "../utils/get-anchored-dropdown-position.js";
import { cn } from "../utils/cn.js";
import { IconTrash } from "./icons/icon-trash.jsx";
import { IconCopy } from "./icons/icon-copy.jsx";
import { IconCheck } from "./icons/icon-check.jsx";
import { Tooltip } from "./tooltip.jsx";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../utils/native-raf.js";

const ITEM_ACTION_CLASS =
  "flex items-center justify-center cursor-pointer text-black/25 transition-colors press-scale";

interface HistoryDropdownProps {
  position: DropdownAnchor | null;
  items: HistoryItem[];
  disconnectedItemIds?: Set<string>;
  onSelectItem?: (item: HistoryItem) => void;
  onRemoveItem?: (item: HistoryItem) => void;
  onCopyItem?: (item: HistoryItem) => void;
  onItemHover?: (historyItemId: string | null) => void;
  onCopyAll?: () => void;
  onCopyAllHover?: (isHovered: boolean) => void;
  onClearAll?: () => void;
  onDismiss?: () => void;
  onDropdownHover?: (isHovered: boolean) => void;
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

const getHistoryItemDisplayName = (item: HistoryItem): string => {
  if (item.elementsCount && item.elementsCount > 1) {
    return `${item.elementsCount} elements`;
  }
  return item.componentName ?? item.tagName;
};

export const HistoryDropdown: Component<HistoryDropdownProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;

  const safePolygonTracker = createSafePolygonTracker();

  const getToolbarTargetRects = () => {
    if (!containerRef) return null;
    const rootNode = containerRef.getRootNode() as Document | ShadowRoot;
    const toolbar = rootNode.querySelector<HTMLElement>(
      "[data-react-grab-toolbar]",
    );
    if (!toolbar) return null;
    const rect = toolbar.getBoundingClientRect();
    return [
      {
        x: rect.x - SAFE_POLYGON_BUFFER_PX,
        y: rect.y - SAFE_POLYGON_BUFFER_PX,
        width: rect.width + SAFE_POLYGON_BUFFER_PX * 2,
        height: rect.height + SAFE_POLYGON_BUFFER_PX * 2,
      },
    ];
  };

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [activeHeaderTooltip, setActiveHeaderTooltip] = createSignal<
    "clear" | "copy" | null
  >(null);
  const [isCopyAllConfirmed, setIsCopyAllConfirmed] = createSignal(false);
  const [confirmedCopyItemId, setConfirmedCopyItemId] = createSignal<
    string | null
  >(null);

  let copyAllFeedbackTimeout: ReturnType<typeof setTimeout> | undefined;
  let copyItemFeedbackTimeout: ReturnType<typeof setTimeout> | undefined;
  let exitAnimationTimeout: ReturnType<typeof setTimeout> | undefined;
  let enterAnimationFrameId: number | undefined;

  const isVisible = () => props.position !== null;
  const [shouldMount, setShouldMount] = createSignal(false);
  const [isAnimatedIn, setIsAnimatedIn] = createSignal(false);
  const [lastAnchorEdge, setLastAnchorEdge] =
    createSignal<DropdownAnchor["edge"]>("bottom");

  const measureContainer = () => {
    if (containerRef) {
      setMeasuredWidth(containerRef.offsetWidth);
      setMeasuredHeight(containerRef.offsetHeight);
    }
  };

  createEffect(() => {
    if (isVisible()) {
      if (props.position) setLastAnchorEdge(props.position.edge);
      clearTimeout(exitAnimationTimeout);
      setShouldMount(true);
      if (enterAnimationFrameId !== undefined)
        nativeCancelAnimationFrame(enterAnimationFrameId);
      // HACK: rAF measures then forces reflow so the browser commits the correct position before transitioning in
      enterAnimationFrameId = nativeRequestAnimationFrame(() => {
        measureContainer();
        // HACK: Reading offsetHeight forces a synchronous reflow so the browser commits layout before the transition starts
        void containerRef?.offsetHeight;
        setIsAnimatedIn(true);
      });
    } else {
      if (enterAnimationFrameId !== undefined)
        nativeCancelAnimationFrame(enterAnimationFrameId);
      setIsAnimatedIn(false);
      exitAnimationTimeout = setTimeout(() => {
        setShouldMount(false);
      }, DROPDOWN_ANIMATION_DURATION_MS);
    }
  });

  // HACK: mouseenter doesn't fire when an element appears under the cursor, so we check :hover after the enter animation commits
  createEffect(
    on(
      isAnimatedIn,
      (animatedIn) => {
        if (animatedIn && containerRef?.matches(":hover")) {
          props.onDropdownHover?.(true);
        }
      },
      { defer: true },
    ),
  );

  const displayPosition = createMemo(
    (previousPosition: { left: number; top: number }) => {
      const position = getAnchoredDropdownPosition({
        anchor: props.position,
        measuredWidth: measuredWidth(),
        measuredHeight: measuredHeight(),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        anchorGapPx: DROPDOWN_ANCHOR_GAP_PX,
        viewportPaddingPx: DROPDOWN_VIEWPORT_PADDING_PX,
        offscreenPosition: DROPDOWN_OFFSCREEN_POSITION,
      });
      if (position.left !== DROPDOWN_OFFSCREEN_POSITION.left) {
        return position;
      }
      return previousPosition;
    },
    DROPDOWN_OFFSCREEN_POSITION,
  );

  const clampedMaxWidth = () =>
    Math.min(
      DROPDOWN_MAX_WIDTH_PX,
      window.innerWidth - displayPosition().left - DROPDOWN_VIEWPORT_PADDING_PX,
    );

  const clampedMaxHeight = () =>
    window.innerHeight - displayPosition().top - DROPDOWN_VIEWPORT_PADDING_PX;

  const panelMinWidth = () =>
    Math.max(DROPDOWN_MIN_WIDTH_PX, props.position?.toolbarWidth ?? 0);

  const handleMenuEvent = (event: Event) => {
    if (event.type === "contextmenu") {
      event.preventDefault();
    }
    event.stopImmediatePropagation();
  };

  onMount(() => {
    measureContainer();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible()) return;
      if (event.code === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        props.onDismiss?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    onCleanup(() => {
      clearTimeout(copyAllFeedbackTimeout);
      clearTimeout(copyItemFeedbackTimeout);
      clearTimeout(exitAnimationTimeout);
      if (enterAnimationFrameId !== undefined)
        nativeCancelAnimationFrame(enterAnimationFrameId);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      safePolygonTracker.stop();
    });
  });

  return (
    <Show when={shouldMount()}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        data-react-grab-history-dropdown
        class="fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none transition-[opacity,transform] duration-100 ease-out will-change-[opacity,transform]"
        style={{
          top: `${displayPosition().top}px`,
          left: `${displayPosition().left}px`,
          "z-index": "2147483647",
          "pointer-events": isAnimatedIn() ? "auto" : "none",
          "transform-origin": DROPDOWN_EDGE_TRANSFORM_ORIGIN[lastAnchorEdge()],
          opacity: isAnimatedIn() ? "1" : "0",
          transform: isAnimatedIn() ? "scale(1)" : "scale(0.95)",
        }}
        onPointerDown={handleMenuEvent}
        onMouseDown={handleMenuEvent}
        onClick={handleMenuEvent}
        onContextMenu={handleMenuEvent}
        onMouseEnter={() => {
          safePolygonTracker.stop();
          props.onDropdownHover?.(true);
        }}
        onMouseLeave={(event: MouseEvent) => {
          const targetRects = getToolbarTargetRects();
          if (targetRects) {
            safePolygonTracker.start(
              { x: event.clientX, y: event.clientY },
              targetRects,
              () => props.onDropdownHover?.(false),
            );
            return;
          }
          props.onDropdownHover?.(false);
        }}
      >
        <div
          class={cn(
            "contain-layout flex flex-col rounded-[10px] antialiased w-fit h-fit overflow-hidden [font-synthesis:none] [corner-shape:superellipse(1.25)]",
            PANEL_STYLES,
          )}
          style={{
            "min-width": `${panelMinWidth()}px`,
            "max-width": `${clampedMaxWidth()}px`,
            "max-height": `${clampedMaxHeight()}px`,
          }}
        >
          <div class="contain-layout shrink-0 flex items-center justify-between px-2 pt-1.5 pb-1">
            <span class="text-[11px] font-medium text-black/40">History</span>
            <Show when={props.items.length > 0}>
              <div class="flex items-center gap-[5px]">
                <div class="relative">
                  <button
                    data-react-grab-ignore-events
                    data-react-grab-history-clear
                    class="contain-layout shrink-0 flex items-center justify-center px-[3px] py-px rounded-sm bg-[#FEF2F2] cursor-pointer transition-all hover:bg-[#FEE2E2] press-scale h-[17px] text-[#B91C1C]"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveHeaderTooltip(null);
                      props.onClearAll?.();
                    }}
                    onMouseEnter={() => setActiveHeaderTooltip("clear")}
                    onMouseLeave={() => setActiveHeaderTooltip(null)}
                  >
                    <IconTrash size={DROPDOWN_ICON_SIZE_PX} />
                  </button>
                  <Tooltip
                    visible={activeHeaderTooltip() === "clear"}
                    position="top"
                  >
                    Clear all
                  </Tooltip>
                </div>
                <div class="relative">
                  <button
                    data-react-grab-ignore-events
                    data-react-grab-history-copy-all
                    class="contain-layout shrink-0 flex items-center justify-center gap-1 px-[3px] py-px rounded-sm bg-white [border-width:0.5px] border-solid border-[#B3B3B3] cursor-pointer transition-all hover:bg-[#F5F5F5] press-scale h-[17px] text-black/60"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveHeaderTooltip(null);
                      props.onCopyAll?.();
                      setIsCopyAllConfirmed(true);
                      clearTimeout(copyAllFeedbackTimeout);
                      copyAllFeedbackTimeout = setTimeout(() => {
                        setIsCopyAllConfirmed(false);
                      }, FEEDBACK_DURATION_MS);
                    }}
                    onMouseEnter={() => {
                      setActiveHeaderTooltip("copy");
                      if (!isCopyAllConfirmed()) {
                        props.onCopyAllHover?.(true);
                      }
                    }}
                    onMouseLeave={() => {
                      setActiveHeaderTooltip(null);
                      props.onCopyAllHover?.(false);
                    }}
                  >
                    <Show
                      when={isCopyAllConfirmed()}
                      fallback={<IconCopy size={DROPDOWN_ICON_SIZE_PX} />}
                    >
                      <IconCheck
                        size={DROPDOWN_ICON_SIZE_PX}
                        class="text-black"
                      />
                    </Show>
                  </button>
                  <Tooltip
                    visible={activeHeaderTooltip() === "copy"}
                    position="top"
                  >
                    Copy all
                  </Tooltip>
                </div>
              </div>
            </Show>
          </div>

          <div class="min-h-0 [border-top-width:0.5px] border-t-solid border-t-[#D9D9D9] px-2 py-1.5">
            <div
              class="flex flex-col max-h-[240px] overflow-y-auto -mx-2 -my-1.5"
              style={{ "scrollbar-color": "rgba(0,0,0,0.15) transparent" }}
            >
              <For each={props.items}>
                {(item) => (
                  <div
                    data-react-grab-ignore-events
                    data-react-grab-history-item
                    class="group contain-layout flex items-start justify-between w-full px-2 py-1 cursor-pointer hover:bg-black/5 focus-within:bg-black/5 text-left gap-2"
                    classList={{
                      "opacity-40 hover:opacity-100": Boolean(
                        props.disconnectedItemIds?.has(item.id),
                      ),
                    }}
                    tabindex="0"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onSelectItem?.(item);
                      setConfirmedCopyItemId(item.id);
                      clearTimeout(copyItemFeedbackTimeout);
                      copyItemFeedbackTimeout = setTimeout(() => {
                        setConfirmedCopyItemId(null);
                      }, FEEDBACK_DURATION_MS);
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.code === "Space" &&
                        event.currentTarget === event.target
                      ) {
                        event.preventDefault();
                        event.stopPropagation();
                        props.onSelectItem?.(item);
                      }
                    }}
                    onMouseEnter={() => {
                      if (!props.disconnectedItemIds?.has(item.id)) {
                        props.onItemHover?.(item.id);
                      }
                    }}
                    onMouseLeave={() => props.onItemHover?.(null)}
                  >
                    <span class="flex flex-col min-w-0 flex-1">
                      <span class="text-[12px] leading-4 font-sans font-medium text-black truncate">
                        {getHistoryItemDisplayName(item)}
                      </span>
                      <Show when={item.commentText}>
                        <span class="text-[11px] leading-3 font-sans text-black/40 truncate mt-0.5">
                          {item.commentText}
                        </span>
                      </Show>
                    </span>
                    <span class="shrink-0 grid">
                      <span class="text-[10px] font-sans text-black/25 group-hover:invisible group-focus-within:invisible [grid-area:1/1] flex items-center justify-end">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                      <span class="invisible group-hover:visible group-focus-within:visible [grid-area:1/1] flex items-center justify-end gap-1.5">
                        <button
                          data-react-grab-ignore-events
                          data-react-grab-history-item-remove
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
                          data-react-grab-history-item-copy
                          class={cn(ITEM_ACTION_CLASS, "hover:text-black/60")}
                          onClick={(event) => {
                            event.stopPropagation();
                            props.onCopyItem?.(item);
                            setConfirmedCopyItemId(item.id);
                            clearTimeout(copyItemFeedbackTimeout);
                            copyItemFeedbackTimeout = setTimeout(() => {
                              setConfirmedCopyItemId(null);
                            }, FEEDBACK_DURATION_MS);
                          }}
                        >
                          <Show
                            when={confirmedCopyItemId() === item.id}
                            fallback={<IconCopy size={DROPDOWN_ICON_SIZE_PX} />}
                          >
                            <IconCheck
                              size={DROPDOWN_ICON_SIZE_PX}
                              class="text-black"
                            />
                          </Show>
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
