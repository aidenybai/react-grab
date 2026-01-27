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
  ActionContext,
} from "../types.js";
import { ARROW_HEIGHT_PX, LABEL_GAP_PX } from "../constants.js";
import { Arrow } from "./selection-label/arrow.js";
import { TagBadge } from "./selection-label/tag-badge.js";
import { BottomSection } from "./selection-label/bottom-section.js";
import { formatShortcut } from "../utils/format-shortcut.js";
import { isScreenshotSupported } from "../utils/is-screenshot-supported.js";
import { getTagDisplay } from "../utils/get-tag-display.js";

interface ContextMenuProps {
  position: { x: number; y: number } | null;
  selectionBounds: OverlayBounds | null;
  tagName?: string;
  componentName?: string;
  hasFilePath: boolean;
  actions?: ContextMenuAction[];
  actionContext?: ActionContext;
  onCopy: () => void;
  onCopyScreenshot: () => void;
  onCopyHtml: () => void;
  onOpen: () => void;
  onDismiss: () => void;
  onHide: () => void;
}

interface MenuItem {
  label: string;
  action: () => void;
  enabled: boolean;
  shortcut?: string;
}

const isEventFromOverlay = (event: Event) =>
  event
    .composedPath()
    .some(
      (element) =>
        element instanceof HTMLElement &&
        element.hasAttribute("data-react-grab-ignore-events"),
    );

export const ContextMenu: Component<ContextMenuProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;

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
      requestAnimationFrame(measureContainer);
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
    const positionLeft = cursorX - labelWidth / 2;
    const arrowLeft = labelWidth / 2;

    const positionBelow =
      bounds.y + bounds.height + ARROW_HEIGHT_PX + LABEL_GAP_PX;
    const positionAbove =
      bounds.y - labelHeight - ARROW_HEIGHT_PX - LABEL_GAP_PX;
    const wouldOverflowBottom =
      positionBelow + labelHeight > window.innerHeight;
    const hasSpaceAbove = positionAbove >= 0;

    const shouldFlipAbove = wouldOverflowBottom && hasSpaceAbove;
    const positionTop = shouldFlipAbove ? positionAbove : positionBelow;
    const arrowPosition: "top" | "bottom" = shouldFlipAbove ? "top" : "bottom";

    return { left: positionLeft, top: positionTop, arrowLeft, arrowPosition };
  };

  const menuItems = (): MenuItem[] => {
    const items: MenuItem[] = [
      { label: "Copy", action: props.onCopy, enabled: true, shortcut: "C" },
    ];
    if (isScreenshotSupported()) {
      items.push({
        label: "Screenshot",
        action: props.onCopyScreenshot,
        enabled: true,
        shortcut: "S",
      });
    }
    items.push({
      label: "Copy HTML",
      action: props.onCopyHtml,
      enabled: true,
    });
    items.push({
      label: "Open",
      action: props.onOpen,
      enabled: props.hasFilePath,
      shortcut: "O",
    });

    const customActions = props.actions ?? [];
    const context = props.actionContext;
    for (const customAction of customActions) {
      const isEnabled =
        typeof customAction.enabled === "function"
          ? context
            ? customAction.enabled(context)
            : false
          : (customAction.enabled ?? true);

      items.push({
        label: customAction.label,
        action: () => {
          if (context) {
            customAction.onAction(context);
          }
        },
        enabled: isEnabled,
        shortcut: customAction.shortcut,
      });
    }

    return items;
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
      if (!isVisible() || isEventFromOverlay(event)) return;
      if (event instanceof MouseEvent && event.button === 2) return;
      props.onDismiss();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible()) return;

      const isEscape = event.code === "Escape";
      const isEnter = event.key === "Enter";
      const hasModifierKey = event.metaKey || event.ctrlKey;
      const keyLower = event.key.toLowerCase();

      if (isEscape) {
        event.preventDefault();
        event.stopPropagation();
        props.onDismiss();
        return;
      }

      const customActions = props.actions ?? [];
      const context = props.actionContext;

      if (isEnter) {
        for (const customAction of customActions) {
          if (customAction.shortcut === "Enter") {
            const isEnabled =
              typeof customAction.enabled === "function"
                ? context
                  ? customAction.enabled(context)
                  : false
                : (customAction.enabled ?? true);

            if (isEnabled && context) {
              event.preventDefault();
              event.stopPropagation();
              customAction.onAction(context);
              props.onHide();
              return;
            }
          }
        }
        return;
      }

      if (!hasModifierKey) return;
      if (event.repeat) return;

      if (keyLower === "s" && isScreenshotSupported()) {
        event.preventDefault();
        event.stopPropagation();
        props.onCopyScreenshot();
        props.onHide();
      } else if (keyLower === "c") {
        event.preventDefault();
        event.stopPropagation();
        props.onCopy();
        props.onHide();
      } else if (keyLower === "o" && props.hasFilePath) {
        event.preventDefault();
        event.stopPropagation();
        props.onOpen();
        props.onHide();
      } else {
        for (const customAction of customActions) {
          if (
            customAction.shortcut &&
            customAction.shortcut !== "Enter" &&
            keyLower === customAction.shortcut.toLowerCase()
          ) {
            const isEnabled =
              typeof customAction.enabled === "function"
                ? context
                  ? customAction.enabled(context)
                  : false
                : (customAction.enabled ?? true);

            if (isEnabled && context) {
              event.preventDefault();
              event.stopPropagation();
              customAction.onAction(context);
              props.onHide();
              return;
            }
          }
        }
      }
    };

    // HACK: Delay mousedown/touchstart listener to avoid catching the triggering right-click
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
        data-react-grab-context-menu
        class="fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_0px_4px_#51515180)] select-none transition-opacity duration-150 ease-out"
        style={{
          top: `${computedPosition().top}px`,
          left: `${computedPosition().left}px`,
          "z-index": "2147483647",
          "pointer-events": "auto",
        }}
        onPointerDown={(event) => event.stopImmediatePropagation()}
        onMouseDown={(event) => event.stopImmediatePropagation()}
        onClick={(event) => event.stopImmediatePropagation()}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
        }}
      >
        {/* Arrow positioned from left edge (leftPercent=0) using computed pixel offset,
            unlike SelectionLabel which centers (leftPercent=50) then applies offset */}
        <Arrow
          position={computedPosition().arrowPosition}
          leftPercent={0}
          leftOffsetPx={computedPosition().arrowLeft}
        />

        <div class="[font-synthesis:none] contain-layout flex flex-col justify-center items-start gap-1 rounded-[7px] antialiased w-fit h-fit min-w-[100px] bg-[linear-gradient(in_oklab_180deg,oklab(100%_0_0)_0%,oklab(98.6%_0_0)_100%)] bg-origin-border border border-solid border-[color(display-p3_1_1_1)] [box-shadow:color(display-p3_0.913_0.913_0.913/34%)_0.4px_0.8px_1px] [outline:0.5px_solid_color(display-p3_0_0_0/10%)]">
          <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 w-fit h-fit pl-1.5 pr-1">
            <TagBadge
              tagName={tagDisplayResult().tagName}
              componentName={tagDisplayResult().componentName}
              isClickable={props.hasFilePath}
              onClick={(event) => {
                event.stopPropagation();
                if (props.hasFilePath) {
                  props.onOpen();
                }
              }}
              shrink
              forceShowIcon={props.hasFilePath}
            />
          </div>
          <BottomSection>
            <div class="flex flex-col w-[calc(100%+16px)] -mx-2 -my-[5px]">
              <For each={menuItems()}>
                {(item) => (
                  <button
                    data-react-grab-ignore-events
                    data-react-grab-menu-item={item.label.toLowerCase()}
                    class="contain-layout flex items-center justify-between w-full px-2 py-1 cursor-pointer transition-colors hover:bg-black/5 text-left border-none bg-transparent disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent"
                    disabled={!item.enabled}
                    onPointerDown={(event) => event.stopPropagation()}
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
