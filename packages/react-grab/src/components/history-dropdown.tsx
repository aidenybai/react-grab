import { Show, For, onSettled, createSignal, createEffect } from "solid-js";
import type { Component } from "solid-js";
import type { HistoryItem, DropdownAnchor } from "../types.js";
import {
  DROPDOWN_EDGE_TRANSFORM_ORIGIN,
  DROPDOWN_ICON_SIZE_PX,
  DROPDOWN_MAX_WIDTH_PX,
  DROPDOWN_MIN_WIDTH_PX,
  DROPDOWN_VIEWPORT_PADDING_PX,
  FEEDBACK_DURATION_MS,
  SAFE_POLYGON_BUFFER_PX,
  Z_INDEX_LABEL,
} from "../constants.js";
import { createSafePolygonTracker } from "../utils/safe-polygon.js";
import { cn } from "../utils/cn.js";
import { IconTrash } from "./icons/icon-trash.jsx";
import { IconCopy } from "./icons/icon-copy.jsx";
import { IconCheck } from "./icons/icon-check.jsx";
import { Tooltip } from "./tooltip.jsx";
import { createMenuHighlight } from "../utils/create-menu-highlight.js";
import { suppressMenuEvent } from "../utils/suppress-menu-event.js";
import { createAnchoredDropdown } from "../utils/create-anchored-dropdown.js";
import { formatRelativeTime } from "../utils/format-relative-time.js";

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

const getHistoryItemDisplayName = (item: HistoryItem): string => {
  if (item.elementsCount && item.elementsCount > 1) {
    return `${item.elementsCount} elements`;
  }
  return item.componentName ?? item.tagName;
};

export const HistoryDropdown: Component<HistoryDropdownProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  const {
    containerRef: highlightContainerRef,
    highlightRef,
    updateHighlight,
    clearHighlight,
  } = createMenuHighlight();

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

  const dropdown = createAnchoredDropdown(
    () => containerRef,
    () => props.position,
  );

  const [activeHeaderTooltip, setActiveHeaderTooltip] = createSignal<
    "clear" | "copy" | null
  >(null);
  const [isCopyAllConfirmed, setIsCopyAllConfirmed] = createSignal(false);
  const [confirmedCopyItemId, setConfirmedCopyItemId] = createSignal<
    string | null
  >(null);

  let copyAllFeedbackTimeout: ReturnType<typeof setTimeout> | undefined;
  let copyItemFeedbackTimeout: ReturnType<typeof setTimeout> | undefined;

  // HACK: mouseenter doesn't fire when an element appears under the cursor, so we check :hover after the enter animation commits
  createEffect(
    () => dropdown.isAnimatedIn(),
    (animatedIn) => {
      if (animatedIn && containerRef?.matches(":hover")) {
        props.onDropdownHover?.(true);
      }
    },
    undefined,
    { defer: true },
  );

  const clampedMaxWidth = () =>
    Math.min(
      DROPDOWN_MAX_WIDTH_PX,
      window.innerWidth -
        dropdown.displayPosition().left -
        DROPDOWN_VIEWPORT_PADDING_PX,
    );

  const clampedMaxHeight = () =>
    window.innerHeight -
    dropdown.displayPosition().top -
    DROPDOWN_VIEWPORT_PADDING_PX;

  const panelMinWidth = () =>
    Math.max(DROPDOWN_MIN_WIDTH_PX, props.position?.toolbarWidth ?? 0);

  onSettled(() => {
    dropdown.measure();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!props.position) return;
      if (event.code === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        props.onDismiss?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      clearTimeout(copyAllFeedbackTimeout);
      clearTimeout(copyItemFeedbackTimeout);
      dropdown.clearAnimationHandles();
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      safePolygonTracker.stop();
    };
  });

  return (
    <Show when={dropdown.shouldMount()}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        data-react-grab-history-dropdown
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
            "bg-white",
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
              ref={highlightContainerRef}
              class="relative flex flex-col max-h-[240px] overflow-y-auto -mx-2 -my-1.5 [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:rgba(0,0,0,0.15)_transparent]"
            >
              <div
                ref={highlightRef}
                class="pointer-events-none absolute bg-black/5 opacity-0 transition-[top,left,width,height,opacity] duration-75 ease-out"
              />
              <For each={props.items}>
                {(itemAccessor) => {
                  const historyItem = () => itemAccessor();
                  return (
                    <div
                      data-react-grab-ignore-events
                      data-react-grab-history-item
                      class={[
                        "group relative z-1 contain-layout flex items-start justify-between w-full px-2 py-1 cursor-pointer text-left gap-2",
                        {
                          "opacity-40 hover:opacity-100": Boolean(
                            props.disconnectedItemIds?.has(historyItem().id),
                          ),
                        },
                      ]}
                      tabindex="0"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onSelectItem?.(historyItem());
                        setConfirmedCopyItemId(historyItem().id);
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
                          props.onSelectItem?.(historyItem());
                        }
                      }}
                      onMouseEnter={(event) => {
                        if (!props.disconnectedItemIds?.has(historyItem().id)) {
                          props.onItemHover?.(historyItem().id);
                        }
                        updateHighlight(event.currentTarget);
                      }}
                      onMouseLeave={() => {
                        props.onItemHover?.(null);
                        clearHighlight();
                      }}
                      onFocus={(event) => updateHighlight(event.currentTarget)}
                      onBlur={clearHighlight}
                    >
                      <span class="flex flex-col min-w-0 flex-1">
                        <span class="text-[12px] leading-4 font-sans font-medium text-black truncate">
                          {getHistoryItemDisplayName(historyItem())}
                        </span>
                        <Show when={historyItem().commentText}>
                          <span class="text-[11px] leading-3 font-sans text-black/40 truncate mt-0.5">
                            {historyItem().commentText}
                          </span>
                        </Show>
                      </span>
                      <span class="shrink-0 grid">
                        <span class="text-[10px] font-sans text-black/25 group-hover:invisible group-focus-within:invisible [grid-area:1/1] flex items-center justify-end">
                          {formatRelativeTime(historyItem().timestamp)}
                        </span>
                        <span class="invisible group-hover:visible group-focus-within:visible [grid-area:1/1] flex items-center justify-end gap-1.5">
                          <button
                            data-react-grab-ignore-events
                            data-react-grab-history-item-remove
                            class={cn(
                              ITEM_ACTION_CLASS,
                              "hover:text-[#B91C1C]",
                            )}
                            onClick={(event) => {
                              event.stopPropagation();
                              props.onRemoveItem?.(historyItem());
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
                              props.onCopyItem?.(historyItem());
                              setConfirmedCopyItemId(historyItem().id);
                              clearTimeout(copyItemFeedbackTimeout);
                              copyItemFeedbackTimeout = setTimeout(() => {
                                setConfirmedCopyItemId(null);
                              }, FEEDBACK_DURATION_MS);
                            }}
                          >
                            <Show
                              when={confirmedCopyItemId() === historyItem().id}
                              fallback={
                                <IconCopy size={DROPDOWN_ICON_SIZE_PX} />
                              }
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
                  );
                }}
              </For>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
