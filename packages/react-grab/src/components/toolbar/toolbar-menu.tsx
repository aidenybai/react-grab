import {
  Show,
  For,
  onMount,
  onCleanup,
  createSignal,
  createEffect,
  createMemo,
} from "solid-js";
import type { Component } from "solid-js";
import type { ToolbarMenuAction, DropdownAnchor } from "../../types.js";
import {
  DROPDOWN_ANCHOR_GAP_PX,
  DROPDOWN_ANIMATION_DURATION_MS,
  DROPDOWN_EDGE_TRANSFORM_ORIGIN,
  DROPDOWN_OFFSCREEN_POSITION,
  DROPDOWN_VIEWPORT_PADDING_PX,
  TOOLBAR_MENU_MIN_WIDTH_PX,
  PANEL_STYLES,
} from "../../constants.js";
import { getAnchoredDropdownPosition } from "../../utils/get-anchored-dropdown-position.js";
import { cn } from "../../utils/cn.js";
import { formatShortcut } from "../../utils/format-shortcut.js";
import { isEventFromOverlay } from "../../utils/is-event-from-overlay.js";
import { resolveToolbarActionEnabled } from "../../utils/resolve-action-enabled.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../../utils/native-raf.js";

interface ToolbarMenuProps {
  position: DropdownAnchor | null;
  actions: ToolbarMenuAction[];
  onDismiss: () => void;
}

export const ToolbarMenu: Component<ToolbarMenuProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [shouldMount, setShouldMount] = createSignal(false);
  const [isAnimatedIn, setIsAnimatedIn] = createSignal(false);
  const [lastAnchorEdge, setLastAnchorEdge] =
    createSignal<DropdownAnchor["edge"]>("bottom");
  const [toggleTrigger, setToggleTrigger] = createSignal(0);

  let exitAnimationTimeout: ReturnType<typeof setTimeout> | undefined;
  let enterAnimationFrameId: number | undefined;

  const measureContainer = () => {
    if (containerRef) {
      setMeasuredWidth(containerRef.offsetWidth);
      setMeasuredHeight(containerRef.offsetHeight);
    }
  };

  createEffect(() => {
    const anchor = props.position;
    if (anchor) {
      setLastAnchorEdge(anchor.edge);
      clearTimeout(exitAnimationTimeout);
      setShouldMount(true);
      if (enterAnimationFrameId !== undefined)
        nativeCancelAnimationFrame(enterAnimationFrameId);
      // HACK: rAF measures then forces reflow so the browser commits the correct position before transitioning in
      enterAnimationFrameId = nativeRequestAnimationFrame(() => {
        measureContainer();
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

  const handleMenuEvent = (event: Event) => {
    if (event.type === "contextmenu") {
      event.preventDefault();
    }
    event.stopImmediatePropagation();
  };

  const handleActionClick = (action: ToolbarMenuAction, event: Event) => {
    event.stopPropagation();
    if (!resolveToolbarActionEnabled(action)) return;

    action.onAction();

    if (action.isActive !== undefined) {
      setToggleTrigger((previous) => previous + 1);
    } else {
      props.onDismiss();
    }
  };

  onMount(() => {
    measureContainer();

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        !props.position ||
        isEventFromOverlay(event, "data-react-grab-ignore-events")
      )
        return;
      props.onDismiss();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!props.position) return;
      if (event.code === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        props.onDismiss();
      }
    };

    // HACK: Delay mousedown listener to avoid catching the triggering click
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
      clearTimeout(exitAnimationTimeout);
      if (enterAnimationFrameId !== undefined)
        nativeCancelAnimationFrame(enterAnimationFrameId);
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
    <Show when={shouldMount()}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        data-react-grab-toolbar-menu
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
      >
        <div
          class={cn(
            "contain-layout flex flex-col rounded-[10px] antialiased w-fit h-fit overflow-hidden [font-synthesis:none] [corner-shape:superellipse(1.25)]",
            PANEL_STYLES,
          )}
          style={{ "min-width": `${TOOLBAR_MENU_MIN_WIDTH_PX}px` }}
        >
          <div class="flex flex-col py-1">
            <For each={props.actions}>
              {(action) => {
                const isEnabled = () => resolveToolbarActionEnabled(action);
                const isToggle = () => action.isActive !== undefined;
                const toggleActive = () => {
                  void toggleTrigger();
                  return Boolean(action.isActive?.());
                };

                return (
                  <button
                    data-react-grab-ignore-events
                    data-react-grab-menu-item={action.id}
                    class="contain-layout flex items-center justify-between w-full px-2 py-1 cursor-pointer transition-colors hover:bg-black/5 text-left border-none bg-transparent disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent"
                    disabled={!isEnabled()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => handleActionClick(action, event)}
                  >
                    <span class="text-[13px] leading-4 font-sans font-medium text-black">
                      {action.label}
                    </span>
                    <Show when={!isToggle() && action.shortcut}>
                      {(shortcutKey) => (
                        <span class="text-[11px] font-sans text-black/50 ml-4">
                          {formatShortcut(shortcutKey())}
                        </span>
                      )}
                    </Show>
                    <Show when={isToggle()}>
                      <div
                        class={cn(
                          "relative rounded-full transition-colors ml-4 shrink-0 w-5 h-3",
                          toggleActive() ? "bg-black" : "bg-black/25",
                        )}
                      >
                        <div
                          class={cn(
                            "absolute top-0.5 rounded-full bg-white transition-transform w-2 h-2",
                            toggleActive() ? "left-2.5" : "left-0.5",
                          )}
                        />
                      </div>
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
