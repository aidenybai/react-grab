import {
  Show,
  onMount,
  onCleanup,
  createSignal,
  createEffect,
  createMemo,
} from "solid-js";
import type { Component } from "solid-js";
import type { DropdownAnchor } from "../types.js";
import {
  DROPDOWN_ANCHOR_GAP_PX,
  DROPDOWN_ANIMATION_DURATION_MS,
  DROPDOWN_EDGE_TRANSFORM_ORIGIN,
  DROPDOWN_OFFSCREEN_POSITION,
  DROPDOWN_VIEWPORT_PADDING_PX,
  PANEL_STYLES,
} from "../constants.js";
import { clampToViewport } from "../utils/clamp-to-viewport.js";
import { cn } from "../utils/cn.js";
import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import { isKeyboardEventTriggeredByInput } from "../utils/is-keyboard-event-triggered-by-input.js";
import { DiscardPrompt } from "./selection-label/discard-prompt.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../utils/native-raf.js";

interface ClearHistoryPromptProps {
  position: DropdownAnchor | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ClearHistoryPrompt: Component<ClearHistoryPromptProps> = (
  props,
) => {
  let containerRef: HTMLDivElement | undefined;

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [shouldMount, setShouldMount] = createSignal(false);
  const [isAnimatedIn, setIsAnimatedIn] = createSignal(false);
  const [lastAnchorEdge, setLastAnchorEdge] =
    createSignal<DropdownAnchor["edge"]>("bottom");

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

  const computedPosition = () => {
    const anchor = props.position;
    const width = measuredWidth();
    const height = measuredHeight();

    if (!anchor || width === 0 || height === 0) {
      return DROPDOWN_OFFSCREEN_POSITION;
    }

    const { edge } = anchor;

    let rawLeft: number;
    let rawTop: number;

    if (edge === "left" || edge === "right") {
      rawLeft =
        edge === "left"
          ? anchor.x + DROPDOWN_ANCHOR_GAP_PX
          : anchor.x - width - DROPDOWN_ANCHOR_GAP_PX;
      rawTop = anchor.y - height / 2;
    } else {
      rawLeft = anchor.x - width / 2;
      rawTop =
        edge === "top"
          ? anchor.y + DROPDOWN_ANCHOR_GAP_PX
          : anchor.y - height - DROPDOWN_ANCHOR_GAP_PX;
    }

    return {
      left: clampToViewport(
        rawLeft,
        width,
        window.innerWidth,
        DROPDOWN_VIEWPORT_PADDING_PX,
      ),
      top: clampToViewport(
        rawTop,
        height,
        window.innerHeight,
        DROPDOWN_VIEWPORT_PADDING_PX,
      ),
    };
  };

  const displayPosition = createMemo(
    (previousPosition: { left: number; top: number }) => {
      const position = computedPosition();
      if (position.left !== DROPDOWN_OFFSCREEN_POSITION.left) {
        return position;
      }
      return previousPosition;
    },
    DROPDOWN_OFFSCREEN_POSITION,
  );

  const handlePromptEvent = (event: Event) => {
    if (event.type === "contextmenu") {
      event.preventDefault();
    }
    event.stopImmediatePropagation();
  };

  onMount(() => {
    measureContainer();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!props.position) return;
      if (isKeyboardEventTriggeredByInput(event)) return;
      const isEnter = event.code === "Enter";
      const isEscape = event.code === "Escape";
      if (isEnter || isEscape) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (isEscape) {
          props.onCancel();
        } else {
          props.onConfirm();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        !props.position ||
        isEventFromOverlay(event, "data-react-grab-ignore-events")
      )
        return;
      props.onCancel();
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

    onCleanup(() => {
      nativeCancelAnimationFrame(frameId);
      clearTimeout(exitAnimationTimeout);
      if (enterAnimationFrameId !== undefined)
        nativeCancelAnimationFrame(enterAnimationFrameId);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("mousedown", handleClickOutside, {
        capture: true,
      });
      window.removeEventListener("touchstart", handleClickOutside, {
        capture: true,
      });
    });
  });

  return (
    <Show when={shouldMount()}>
      <div
        ref={containerRef}
        data-react-grab-ignore-events
        data-react-grab-clear-history-prompt
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
        onPointerDown={handlePromptEvent}
        onMouseDown={handlePromptEvent}
        onClick={handlePromptEvent}
        onContextMenu={handlePromptEvent}
      >
        <div
          class={cn(
            "contain-layout flex flex-col rounded-[10px] antialiased w-fit h-fit [font-synthesis:none] [corner-shape:superellipse(1.25)]",
            PANEL_STYLES,
          )}
        >
          <DiscardPrompt
            label="Clear history?"
            cancelOnEscape
            onConfirm={props.onConfirm}
            onCancel={props.onCancel}
          />
        </div>
      </div>
    </Show>
  );
};
