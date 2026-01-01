import { Show, For, onMount, onCleanup, createSignal, createEffect } from "solid-js";
import type { Component } from "solid-js";
import type { OverlayBounds } from "../types.js";
import {
  VIEWPORT_MARGIN_PX,
  ARROW_HEIGHT_PX,
  LABEL_GAP_PX,
} from "../constants.js";
import { Arrow } from "./selection-label/arrow.js";
import { TagBadge } from "./selection-label/tag-badge.js";

interface ContextMenuProps {
  position: { x: number; y: number } | null;
  selectionBounds: OverlayBounds | null;
  tagName?: string;
  componentName?: string;
  hasFilePath: boolean;
  hasAgent: boolean;
  onCopy: () => void;
  onOpen: () => void;
  onPrompt: () => void;
  onDismiss: () => void;
}

interface MenuItem {
  label: string;
  action: () => void;
  enabled: boolean;
}

const isEventFromOverlay = (event: Event) =>
  event.composedPath().some(
    (element) => element instanceof HTMLElement && element.hasAttribute("data-react-grab-ignore-events")
  );

export const ContextMenu: Component<ContextMenuProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [arrowPosition, setArrowPosition] = createSignal<"bottom" | "top">("bottom");

  const isVisible = () => props.position !== null;

  const displayName = () => {
    if (props.componentName && props.tagName) {
      return `${props.componentName}.${props.tagName}`;
    }
    return props.componentName || props.tagName || "element";
  };

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
      return { left: -9999, top: -9999, arrowLeft: 0 };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const cursorX = clickPosition.x ?? bounds.x + bounds.width / 2;

    let positionLeft = cursorX - labelWidth / 2;
    let positionTop = bounds.y + bounds.height + ARROW_HEIGHT_PX + LABEL_GAP_PX;

    positionLeft = Math.max(VIEWPORT_MARGIN_PX, Math.min(positionLeft, viewportWidth - labelWidth - VIEWPORT_MARGIN_PX));

    const totalHeightNeeded = labelHeight + ARROW_HEIGHT_PX + LABEL_GAP_PX;
    const fitsBelow = positionTop + labelHeight <= viewportHeight - VIEWPORT_MARGIN_PX;

    if (!fitsBelow) {
      positionTop = bounds.y - totalHeightNeeded;
      setArrowPosition("top");
    } else {
      setArrowPosition("bottom");
    }

    positionTop = Math.max(VIEWPORT_MARGIN_PX, positionTop);

    const arrowLeft = Math.max(12, Math.min(cursorX - positionLeft, labelWidth - 12));

    return { left: positionLeft, top: positionTop, arrowLeft };
  };

  const menuItems = (): MenuItem[] => {
    const items: MenuItem[] = [
      { label: "Copy", action: props.onCopy, enabled: true },
      { label: "Open", action: props.onOpen, enabled: props.hasFilePath },
    ];
    if (props.hasAgent) {
      items.push({ label: "Prompt", action: props.onPrompt, enabled: true });
    }
    return items;
  };

  const handleAction = (item: MenuItem, event: Event) => {
    event.stopPropagation();
    if (item.enabled) {
      item.action();
    }
  };

  onMount(() => {
    measureContainer();

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!isVisible() || isEventFromOverlay(event)) return;
      props.onDismiss();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        props.onDismiss();
      }
    };

    // HACK: Delay mousedown/touchstart listener to avoid catching the triggering right-click
    const frameId = requestAnimationFrame(() => {
      window.addEventListener("mousedown", handleClickOutside, { capture: true });
      window.addEventListener("touchstart", handleClickOutside, { capture: true });
    });
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    onCleanup(() => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousedown", handleClickOutside, { capture: true });
      window.removeEventListener("touchstart", handleClickOutside, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    });
  });

  return (
    <Show when={isVisible()}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        class="fixed font-sans text-[13px] antialiased transition-opacity duration-150 ease-out filter-[drop-shadow(0px_0px_4px_#51515180)] select-none"
        style={{
          top: `${computedPosition().top}px`,
          left: `${computedPosition().left}px`,
          "z-index": "2147483647",
          "pointer-events": "auto",
        }}
        onPointerDown={(event) => event.stopImmediatePropagation()}
        onMouseDown={(event) => event.stopImmediatePropagation()}
        onClick={(event) => event.stopImmediatePropagation()}
      >
        <Arrow position={arrowPosition()} leftPx={computedPosition().arrowLeft} />

        <div class="[font-synthesis:none] contain-layout flex flex-col rounded-sm bg-white antialiased w-fit h-fit overflow-hidden p-1.5 gap-1">
          <TagBadge tagName={displayName()} isClickable={false} onClick={(event) => event.stopPropagation()} shrink />
          <div class="flex flex-col">
            <For each={menuItems()}>
              {(item) => (
                <button
                  data-react-grab-ignore-events
                  class="contain-layout flex items-center px-0.5 py-0.5 cursor-pointer transition-colors hover:bg-black/5 text-left border-none bg-transparent rounded-sm disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent"
                  disabled={!item.enabled}
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerUp={(event) => handleAction(item, event)}
                  onClick={(event) => handleAction(item, event)}
                >
                  <span class="text-[13px] leading-4 font-sans font-medium text-black">
                    {item.label}
                  </span>
                </button>
              )}
            </For>
          </div>
        </div>
      </div>
    </Show>
  );
};
