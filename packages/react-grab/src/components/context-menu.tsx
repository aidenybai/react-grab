import { Show, For, onMount, onCleanup, createSignal, createEffect, createMemo } from "solid-js";
import type { Component } from "solid-js";
import type {
  Position,
  OverlayBounds,
  ContextMenuAction,
  ContextMenuActionContext,
} from "../types.js";
import {
  ARROW_HEIGHT_PX,
  DROPDOWN_OFFSCREEN_POSITION,
  LABEL_GAP_PX,
  MENU_HIGHLIGHT_CORNER_SHAPE,
  MENU_PANEL_CORNER_RADIUS_PX,
  Z_INDEX_OVERLAY,
} from "../constants.js";
import { cn } from "../utils/cn.js";
import { Arrow } from "./selection-label/arrow.js";
import { TagBadge } from "./selection-label/tag-badge.js";
import { BottomSection } from "./selection-label/bottom-section.js";
import { ShortcutHint } from "./shortcut-hint.js";
import { getTagDisplay } from "../utils/get-tag-display.js";
import { resolveActionEnabled } from "../utils/resolve-action-enabled.js";
import { nativeRequestAnimationFrame } from "../utils/native-raf.js";
import { createMenuHighlight } from "../utils/create-menu-highlight.js";
import { suppressMenuEvent } from "../utils/suppress-menu-event.js";
import { registerOverlayDismiss } from "../utils/register-overlay-dismiss.js";

interface ContextMenuProps {
  position: Position | null;
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
  let menuListRef: HTMLDivElement | undefined;
  let previouslyFocusedElement: Element | null = null;
  const {
    containerRef: highlightContainerRef,
    highlightRef,
    updateHighlight,
    clearHighlight,
  } = createMenuHighlight({
    bottomCornerRadiusPx: MENU_PANEL_CORNER_RADIUS_PX,
    cornerShape: MENU_HIGHLIGHT_CORNER_SHAPE,
  });

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [focusedItemIndex, setFocusedItemIndex] = createSignal(-1);

  const isVisible = () => props.position !== null;

  const tagDisplayResult = createMemo(() =>
    getTagDisplay({
      tagName: props.tagName,
      componentName: props.componentName,
    }),
  );

  const measureContainer = () => {
    if (containerRef) {
      const rect = containerRef.getBoundingClientRect();
      setMeasuredWidth(rect.width);
      setMeasuredHeight(rect.height);
    }
  };

  // Elements that were just mounted may not have been laid out yet, so without
  // deferring to the next frame the measured dimensions are zero and the menu
  // would flash at the wrong position before jumping to its correct spot.
  createEffect(() => {
    if (isVisible()) {
      nativeRequestAnimationFrame(measureContainer);
    }
  });

  const computedPosition = createMemo(() => {
    const bounds = props.selectionBounds;
    const clickPosition = props.position;
    const labelWidth = measuredWidth();
    const labelHeight = measuredHeight();

    if (labelWidth === 0 || labelHeight === 0 || !bounds || !clickPosition) {
      return {
        left: DROPDOWN_OFFSCREEN_POSITION.left,
        top: DROPDOWN_OFFSCREEN_POSITION.top,
        arrowLeft: 0,
        arrowPosition: "bottom" as const,
      };
    }

    const cursorX = clickPosition.x ?? bounds.x + bounds.width / 2;
    const positionLeft = Math.max(
      LABEL_GAP_PX,
      Math.min(cursorX - labelWidth / 2, window.innerWidth - labelWidth - LABEL_GAP_PX),
    );
    const arrowLeft = Math.max(
      ARROW_HEIGHT_PX,
      Math.min(cursorX - positionLeft, labelWidth - ARROW_HEIGHT_PX),
    );

    const positionBelow = bounds.y + bounds.height + ARROW_HEIGHT_PX + LABEL_GAP_PX;
    const positionAbove = bounds.y - labelHeight - ARROW_HEIGHT_PX - LABEL_GAP_PX;
    const wouldOverflowBottom = positionBelow + labelHeight > window.innerHeight;
    const hasSpaceAbove = positionAbove >= 0;

    const shouldFlipAbove = wouldOverflowBottom && hasSpaceAbove;
    let positionTop = shouldFlipAbove ? positionAbove : positionBelow;
    let arrowPosition: "top" | "bottom" = shouldFlipAbove ? "top" : "bottom";

    if (wouldOverflowBottom && !hasSpaceAbove) {
      const cursorY = clickPosition.y ?? bounds.y + bounds.height / 2;
      positionTop = Math.max(
        LABEL_GAP_PX,
        Math.min(cursorY + LABEL_GAP_PX, window.innerHeight - labelHeight - LABEL_GAP_PX),
      );
      arrowPosition = "top";
    }

    return { left: positionLeft, top: positionTop, arrowLeft, arrowPosition };
  });

  const menuItems = createMemo<MenuItem[]>(() => {
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
  });

  const handleAction = (item: MenuItem, event: Event) => {
    event.stopPropagation();
    if (item.enabled) {
      item.action();
      props.onHide();
    }
  };

  const getMenuItemButtons = (): HTMLButtonElement[] => {
    if (!menuListRef) return [];
    return Array.from(
      menuListRef.querySelectorAll<HTMLButtonElement>("[data-react-grab-menu-item]"),
    );
  };

  const focusItemAt = (itemIndex: number): boolean => {
    const itemButtons = getMenuItemButtons();
    if (itemButtons.length === 0) return false;

    const totalItems = itemButtons.length;
    let normalizedIndex = ((itemIndex % totalItems) + totalItems) % totalItems;

    for (let attempt = 0; attempt < totalItems; attempt++) {
      const candidateButton = itemButtons[normalizedIndex];
      if (candidateButton && !candidateButton.disabled) {
        candidateButton.focus({ preventScroll: true });
        setFocusedItemIndex(normalizedIndex);
        updateHighlight(candidateButton);
        return true;
      }
      normalizedIndex = (normalizedIndex + 1) % totalItems;
    }
    return false;
  };

  const focusFirstEnabledItem = (): boolean => focusItemAt(0);

  const focusLastEnabledItem = (): boolean => {
    const itemButtons = getMenuItemButtons();
    for (let itemIndex = itemButtons.length - 1; itemIndex >= 0; itemIndex--) {
      if (!itemButtons[itemIndex]?.disabled) {
        return focusItemAt(itemIndex);
      }
    }
    return false;
  };

  const moveFocusByOffset = (offset: 1 | -1): void => {
    const itemButtons = getMenuItemButtons();
    if (itemButtons.length === 0) return;
    const currentIndex = focusedItemIndex();
    const startIndex = currentIndex === -1 ? (offset === 1 ? -1 : 0) : currentIndex;
    const totalItems = itemButtons.length;
    let nextIndex = (((startIndex + offset) % totalItems) + totalItems) % totalItems;

    for (let attempt = 0; attempt < totalItems; attempt++) {
      const candidateButton = itemButtons[nextIndex];
      if (candidateButton && !candidateButton.disabled) {
        focusItemAt(nextIndex);
        return;
      }
      nextIndex = (((nextIndex + offset) % totalItems) + totalItems) % totalItems;
    }
  };

  const restorePreviousFocus = () => {
    const target = previouslyFocusedElement;
    previouslyFocusedElement = null;
    if (!(target instanceof HTMLElement) || !document.contains(target)) return;
    // Activating a menu item often triggers a state change that focuses
    // something else (e.g. the prompt-mode textarea). Deferring lets that
    // focus land first, and the guard below skips restore when it has, so
    // we do not yank focus away from the action's intended target.
    nativeRequestAnimationFrame(() => {
      const activeElement = document.activeElement;
      const isBodyFocused = activeElement === document.body || activeElement === null;
      if (!isBodyFocused) return;
      target.focus({ preventScroll: true });
    });
  };

  onMount(() => {
    measureContainer();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible()) return;

      const isArrowDown = event.key === "ArrowDown";
      const isArrowUp = event.key === "ArrowUp";
      const isHome = event.key === "Home";
      const isEnd = event.key === "End";
      const isTab = event.key === "Tab";
      const isEnter = event.key === "Enter";
      const hasModifierKey = event.metaKey || event.ctrlKey;
      const keyLower = event.key.toLowerCase();

      if (isArrowDown || isArrowUp || isHome || isEnd) {
        event.preventDefault();
        event.stopPropagation();
        if (isArrowDown) moveFocusByOffset(1);
        else if (isArrowUp) moveFocusByOffset(-1);
        else if (isHome) focusFirstEnabledItem();
        else focusLastEnabledItem();
        return;
      }

      if (isTab) {
        event.preventDefault();
        event.stopPropagation();
        moveFocusByOffset(event.shiftKey ? -1 : 1);
        return;
      }

      const pluginActions = props.actions ?? [];
      const context = props.actionContext;

      const runActionIfAllowed = (action: ContextMenuAction) => {
        if (!context) return;
        if (!resolveActionEnabled(action, context)) return;
        event.preventDefault();
        event.stopPropagation();
        action.onAction(context);
        props.onHide();
      };

      if (isEnter) {
        const focusedIndex = focusedItemIndex();
        if (focusedIndex >= 0) {
          const focusedAction = pluginActions[focusedIndex];
          if (focusedAction) {
            runActionIfAllowed(focusedAction);
            return;
          }
        }
        const enterAction = pluginActions.find((action) => action.shortcut === "Enter");
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

    const unregisterOverlayDismiss = registerOverlayDismiss({
      isOpen: isVisible,
      onDismiss: props.onDismiss,
      shouldIgnoreRightClick: true,
    });
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    onCleanup(() => {
      unregisterOverlayDismiss();
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    });
  });

  // Capture focus before the menu opens so we can return focus to the
  // originating element when it dismisses. Restore happens on close so both
  // outside-click/Escape (onDismiss) and item-activation (onHide) paths run
  // through the same restore.
  createEffect(() => {
    if (isVisible()) {
      const activeElement = document.activeElement;
      const isActiveInsideMenu =
        activeElement instanceof Element &&
        containerRef instanceof Element &&
        containerRef.contains(activeElement);
      if (!isActiveInsideMenu) {
        previouslyFocusedElement = activeElement;
      }
      nativeRequestAnimationFrame(() => {
        if (isVisible()) focusFirstEnabledItem();
      });
    } else {
      setFocusedItemIndex(-1);
      restorePreviousFocus();
    }
  });

  const accessibleMenuLabel = createMemo(() => {
    const { tagName, componentName } = tagDisplayResult();
    const displayName = componentName ? `${componentName}.${tagName}` : tagName;
    return `Actions for ${displayName}`;
  });

  return (
    <Show when={isVisible()}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        data-react-grab-context-menu
        class="fixed font-sans text-[13px] antialiased [filter:var(--rg-drop-shadow)] select-none"
        style={{
          top: `${computedPosition().top}px`,
          left: `${computedPosition().left}px`,
          "z-index": `${Z_INDEX_OVERLAY}`,
          "pointer-events": "auto",
        }}
        onPointerDown={suppressMenuEvent}
        onMouseDown={suppressMenuEvent}
        onClick={suppressMenuEvent}
        onContextMenu={suppressMenuEvent}
      >
        <Arrow
          position={computedPosition().arrowPosition}
          leftPercent={0}
          leftOffsetPx={computedPosition().arrowLeft}
        />

        <div
          class={cn(
            "contain-layout flex flex-col justify-center items-start rounded-[14px] antialiased w-fit h-fit min-w-[100px] [font-synthesis:none] [corner-shape:superellipse(1.25)]",
            "bg-[var(--rg-panel-bg)]",
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
                  const openAction = props.actions?.find((action) => action.id === "open");
                  openAction?.onAction(props.actionContext);
                }
              }}
              shrink
              forceShowIcon={props.hasFilePath}
            />
          </div>
          <BottomSection>
            <div
              ref={(element) => {
                menuListRef = element;
                highlightContainerRef(element);
              }}
              role="menu"
              aria-orientation="vertical"
              aria-label={accessibleMenuLabel()}
              class="relative flex flex-col w-[calc(100%+16px)] -mx-2 -my-1.5"
            >
              <div
                ref={highlightRef}
                aria-hidden="true"
                class="pointer-events-none absolute opacity-0 transition-[top,left,width,height,opacity,border-radius] duration-75 ease-out bg-[var(--rg-surface-hover)]"
              />
              <For each={menuItems()}>
                {(item, itemIndex) => (
                  <button
                    data-react-grab-ignore-events
                    data-react-grab-menu-item={item.label.toLowerCase()}
                    type="button"
                    role="menuitem"
                    tabindex={focusedItemIndex() === itemIndex() ? 0 : -1}
                    aria-disabled={!item.enabled}
                    class="relative z-1 contain-layout flex items-center justify-between w-full px-2 py-1 cursor-pointer text-left border-none bg-transparent disabled:opacity-40 disabled:cursor-default"
                    disabled={!item.enabled}
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerEnter={(event) => {
                      if (item.enabled) {
                        updateHighlight(event.currentTarget);
                      }
                    }}
                    onPointerLeave={clearHighlight}
                    onFocus={(event) => {
                      if (item.enabled) {
                        updateHighlight(event.currentTarget);
                      }
                      setFocusedItemIndex(itemIndex());
                    }}
                    onClick={(event) => handleAction(item, event)}
                  >
                    <span class="text-[13px] leading-4 font-sans font-medium text-[var(--rg-text-primary)]">
                      {item.label}
                    </span>
                    <Show when={item.shortcut}>
                      {(shortcut) => (
                        <ShortcutHint
                          shortcut={shortcut()}
                          class="text-[11px] font-sans text-[var(--rg-text-secondary)] ml-4"
                        />
                      )}
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
