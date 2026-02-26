import {
  Show,
  For,
  onMount,
  onCleanup,
  createSignal,
  createEffect,
} from "solid-js";
import type { Component } from "solid-js";
import type {
  OverlayBounds,
  ContextMenuAction,
  ContextMenuActionContext,
} from "../types.js";
import { ARROW_HEIGHT_PX, LABEL_GAP_PX, PANEL_STYLES } from "../constants.js";
import { cn } from "../utils/cn.js";
import { Arrow } from "./selection-label/arrow.js";
import { TagBadge } from "./selection-label/tag-badge.js";
import { BottomSection } from "./selection-label/bottom-section.js";
import { formatShortcut } from "../utils/format-shortcut.js";
import { getTagDisplay } from "../utils/get-tag-display.js";
import { resolveActionEnabled } from "../utils/resolve-action-enabled.js";
import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../utils/native-raf.js";
import { createMenuHighlight } from "../utils/create-menu-highlight.js";

interface ContextMenuProps {
  position: { x: number; y: number } | null;
  selectionBounds: OverlayBounds | null;
  tagName?: string;
  componentName?: string;
  hasFilePath: boolean;
  actions?: ContextMenuAction[];
  actionContext?: ContextMenuActionContext;
  onDismiss: () => void;
  onHide: () => void;
}

interface MenuItem {
  label: string;
  action: () => void;
  enabled: boolean;
  shortcut?: string;
}

export const ContextMenu: Component<ContextMenuProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  const {
    containerRef: highlightContainerRef,
    highlightRef,
    updateHighlight,
    clearHighlight,
  } = createMenuHighlight();

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);

  const isVisible = () => props.position !== null;

  const tagDisplayResult = () =>
    getTagDisplay({
      tagName: props.tagName,
      componentName: props.componentName,
    });

  const measureContainer = () => {
    if (containerRef) {
      const rect = containerRef.getBoundingClientRect();
      setMeasuredWidth(rect.width);
      setMeasuredHeight(rect.height);
    }
  };

  createEffect(() => {
    if (isVisible()) {
      nativeRequestAnimationFrame(measureContainer);
    }
  });

  const computedPosition = () => {
    const bounds = props.selectionBounds;
    const clickPosition = props.position;
    const labelWidth = measuredWidth();
    const labelHeight = measuredHeight();

    if (labelWidth === 0 || labelHeight === 0 || !bounds || !clickPosition) {
      return {
        left: -9999,
        top: -9999,
        arrowLeft: 0,
        arrowPosition: "bottom" as const,
      };
    }

    const cursorX = clickPosition.x ?? bounds.x + bounds.width / 2;
    const positionLeft = Math.max(
      LABEL_GAP_PX,
      Math.min(
        cursorX - labelWidth / 2,
        window.innerWidth - labelWidth - LABEL_GAP_PX,
      ),
    );
    const arrowLeft = Math.max(
      ARROW_HEIGHT_PX,
      Math.min(cursorX - positionLeft, labelWidth - ARROW_HEIGHT_PX),
    );

    const positionBelow =
      bounds.y + bounds.height + ARROW_HEIGHT_PX + LABEL_GAP_PX;
    const positionAbove =
      bounds.y - labelHeight - ARROW_HEIGHT_PX - LABEL_GAP_PX;
    const wouldOverflowBottom =
      positionBelow + labelHeight > window.innerHeight;
    const hasSpaceAbove = positionAbove >= 0;

    const shouldFlipAbove = wouldOverflowBottom && hasSpaceAbove;
    let positionTop = shouldFlipAbove ? positionAbove : positionBelow;
    let arrowPosition: "top" | "bottom" = shouldFlipAbove ? "top" : "bottom";

    if (wouldOverflowBottom && !hasSpaceAbove) {
      const cursorY = clickPosition.y ?? bounds.y + bounds.height / 2;
      positionTop = Math.max(
        LABEL_GAP_PX,
        Math.min(
          cursorY + LABEL_GAP_PX,
          window.innerHeight - labelHeight - LABEL_GAP_PX,
        ),
      );
      arrowPosition = "top";
    }

    return { left: positionLeft, top: positionTop, arrowLeft, arrowPosition };
  };

  const menuItems = (): MenuItem[] => {
    const pluginActions = props.actions ?? [];
    const context = props.actionContext;

    return pluginActions.map((action) => ({
      label: action.label,
      action: () => {
        if (context) {
          action.onAction(context);
        }
      },
      enabled: resolveActionEnabled(action, context),
      shortcut: action.shortcut,
    }));
  };

  const handleMenuEvent = (event: Event) => {
    if (event.type === "contextmenu") {
      event.preventDefault();
    }
    event.stopImmediatePropagation();
  };

  const handleAction = (item: MenuItem, event: Event) => {
    event.stopPropagation();
    if (item.enabled) {
      item.action();
      props.onHide();
    }
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
      props.onDismiss();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible()) return;

      const isEscape = event.code === "Escape";
      const isEnter = event.key === "Enter";
      const hasModifierKey = event.metaKey || event.ctrlKey;
      const keyLower = event.key.toLowerCase();

      const pluginActions = props.actions ?? [];
      const context = props.actionContext;

      const runActionIfAllowed = (action: ContextMenuAction) => {
        if (!context) return false;
        if (!resolveActionEnabled(action, context)) return false;
        event.preventDefault();
        event.stopPropagation();
        action.onAction(context);
        props.onHide();
        return true;
      };

      if (isEscape) {
        event.preventDefault();
        event.stopPropagation();
        props.onDismiss();
        return;
      }

      if (isEnter) {
        const enterAction = pluginActions.find(
          (action) => action.shortcut === "Enter",
        );
        if (enterAction) {
          runActionIfAllowed(enterAction);
        }
        return;
      }

      if (!hasModifierKey) return;
      if (event.repeat) return;

      const modifierAction = pluginActions.find(
        (action) =>
          action.shortcut &&
          action.shortcut !== "Enter" &&
          keyLower === action.shortcut.toLowerCase(),
      );
      if (modifierAction) {
        runActionIfAllowed(modifierAction);
      }
    };

    // HACK: Delay mousedown/touchstart listener to avoid catching the triggering right-click
    const frameId = nativeRequestAnimationFrame(() => {
      window.addEventListener("mousedown", handleClickOutside, {
        capture: true,
      });
      window.addEventListener("touchstart", handleClickOutside, {
        capture: true,
      });
    });
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    onCleanup(() => {
      nativeCancelAnimationFrame(frameId);
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
        data-react-grab-context-menu
        class="fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_1px_2px_#51515140)] select-none"
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
        {/* Arrow positioned from left edge (leftPercent=0) using computed pixel offset,
            unlike SelectionLabel which centers (leftPercent=50) then applies offset */}
        <Arrow
          position={computedPosition().arrowPosition}
          leftPercent={0}
          leftOffsetPx={computedPosition().arrowLeft}
        />

        <div
          class={cn(
            "contain-layout flex flex-col justify-center items-start rounded-[10px] antialiased w-fit h-fit min-w-[100px] [font-synthesis:none] [corner-shape:superellipse(1.25)]",
            PANEL_STYLES,
          )}
        >
          <div class="contain-layout shrink-0 flex items-center gap-1 pt-1.5 pb-1 w-fit h-fit px-2">
            <TagBadge
              tagName={tagDisplayResult().tagName}
              componentName={tagDisplayResult().componentName}
              isClickable={props.hasFilePath}
              onClick={(event) => {
                event.stopPropagation();
                if (props.hasFilePath && props.actionContext) {
                  const openAction = props.actions?.find(
                    (action) => action.id === "open",
                  );
                  openAction?.onAction(props.actionContext);
                }
              }}
              shrink
              forceShowIcon={props.hasFilePath}
            />
          </div>
          <BottomSection>
            <div ref={highlightContainerRef} class="relative flex flex-col w-[calc(100%+16px)] -mx-2 -my-1.5">
              <div
                ref={highlightRef}
                class="pointer-events-none absolute bg-black/5 opacity-0 transition-[top,left,width,height,opacity] duration-75 ease-out"
              />
              <For each={menuItems()}>
                {(item) => (
                  <button
                    data-react-grab-ignore-events
                    data-react-grab-menu-item={item.label.toLowerCase()}
                    class="relative z-1 contain-layout flex items-center justify-between w-full px-2 py-1 cursor-pointer text-left border-none bg-transparent disabled:opacity-40 disabled:cursor-default"
                    disabled={!item.enabled}
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerEnter={(event) => {
                      if (item.enabled) {
                        updateHighlight(event.currentTarget);
                      }
                    }}
                    onPointerLeave={clearHighlight}
                    onClick={(event) => handleAction(item, event)}
                  >
                    <span class="text-[13px] leading-4 font-sans font-medium text-black">
                      {item.label}
                    </span>
                    <Show when={item.shortcut}>
                      <span class="text-[11px] font-sans text-black/50 ml-4">
                        {formatShortcut(item.shortcut!)}
                      </span>
                    </Show>
                  </button>
                )}
              </For>
            </div>
          </BottomSection>
        </div>
      </div>
    </Show>
  );
};
