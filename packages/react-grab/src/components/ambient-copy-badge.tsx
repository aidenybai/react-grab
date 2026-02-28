import { Show, createSignal, createEffect, on, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { OverlayBounds } from "../types.js";
import {
  AMBIENT_BADGE_OFFSET_PX,
  AMBIENT_BADGE_FADE_MS,
  VIEWPORT_MARGIN_PX,
  PANEL_STYLES,
} from "../constants.js";
import { cn } from "../utils/cn.js";
import { IconCopy } from "./icons/icon-copy.jsx";
import { IconCheck } from "./icons/icon-check.jsx";
import { IconOpen } from "./icons/icon-open.jsx";

interface AmbientCopyBadgeProps {
  visible?: boolean;
  bounds?: OverlayBounds;
  tagName?: string;
  componentName?: string;
  hasFilePath?: boolean;
  trailCount?: number;
  copyStatus?: "idle" | "copied";
  onCopy?: () => void;
  onOpenFile?: () => void;
  onHoverChange?: (isHovered: boolean) => void;
}

export const AmbientCopyBadge: Component<AmbientCopyBadgeProps> = (props) => {
  let badgeRef: HTMLDivElement | undefined;

  const [shouldMount, setShouldMount] = createSignal(false);
  const [isAnimatedIn, setIsAnimatedIn] = createSignal(false);
  const [isNameHovered, setIsNameHovered] = createSignal(false);

  let exitTimeout: ReturnType<typeof setTimeout> | undefined;
  let enterFrameId: number | undefined;

  createEffect(
    on(
      () => props.visible,
      (isVisible) => {
        if (isVisible) {
          clearTimeout(exitTimeout);
          setShouldMount(true);
          if (enterFrameId !== undefined) cancelAnimationFrame(enterFrameId);
          enterFrameId = requestAnimationFrame(() => {
            void badgeRef?.offsetHeight;
            setIsAnimatedIn(true);
          });
        } else {
          if (enterFrameId !== undefined) cancelAnimationFrame(enterFrameId);
          setIsAnimatedIn(false);
          exitTimeout = setTimeout(() => {
            setShouldMount(false);
          }, AMBIENT_BADGE_FADE_MS);
        }
      },
    ),
  );

  onCleanup(() => {
    clearTimeout(exitTimeout);
    if (enterFrameId !== undefined) cancelAnimationFrame(enterFrameId);
  });

  const badgePosition = () => {
    const bounds = props.bounds;
    if (!bounds) return { x: -9999, y: -9999, isBelow: false };

    const estimatedBadgeWidth = 200;
    const estimatedBadgeHeight = 28;

    const hasRoomAbove =
      bounds.y - estimatedBadgeHeight - AMBIENT_BADGE_OFFSET_PX >
      VIEWPORT_MARGIN_PX;

    const rawX =
      bounds.x + bounds.width - estimatedBadgeWidth - AMBIENT_BADGE_OFFSET_PX;
    const clampedX = Math.max(
      VIEWPORT_MARGIN_PX,
      Math.min(
        rawX,
        window.innerWidth - estimatedBadgeWidth - VIEWPORT_MARGIN_PX,
      ),
    );

    const positionY = hasRoomAbove
      ? bounds.y - estimatedBadgeHeight - AMBIENT_BADGE_OFFSET_PX
      : bounds.y + bounds.height + AMBIENT_BADGE_OFFSET_PX;

    return { x: clampedX, y: positionY, isBelow: !hasRoomAbove };
  };

  const displayName = () => {
    if (props.componentName) {
      return (
        <>
          <span class="text-black font-medium">{props.componentName}</span>
          <span class="text-black/40">.{props.tagName}</span>
        </>
      );
    }
    return <span class="text-black font-medium">&lt;{props.tagName}&gt;</span>;
  };

  const handleBadgeMouseEnter = () => {
    props.onHoverChange?.(true);
  };

  const handleBadgeMouseLeave = () => {
    props.onHoverChange?.(false);
  };

  const handleCopyClick = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    props.onCopy?.();
  };

  const handleNameClick = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (props.hasFilePath) {
      props.onOpenFile?.();
    }
  };

  return (
    <Show when={shouldMount()}>
      <div
        ref={badgeRef}
        data-react-grab-ignore-events
        data-react-grab-ambient-badge
        class={cn(
          "fixed font-sans text-[11px] antialiased select-none transition-[opacity,transform] ease-out pointer-events-auto will-change-[opacity,transform] filter-[drop-shadow(0px_1px_2px_#51515140)]",
        )}
        style={{
          "z-index": "2147483647",
          left: "0px",
          top: "0px",
          transform: `translate(${badgePosition().x}px, ${badgePosition().y}px)`,
          opacity: isAnimatedIn() ? "1" : "0",
          "transition-duration": `${AMBIENT_BADGE_FADE_MS}ms`,
        }}
        onMouseEnter={handleBadgeMouseEnter}
        onMouseLeave={handleBadgeMouseLeave}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          class={cn(
            "contain-layout flex items-center gap-1.5 px-2 py-1 rounded-[10px] [font-synthesis:none] [corner-shape:superellipse(1.25)]",
            PANEL_STYLES,
          )}
        >
          <div
            class={cn(
              "flex items-center gap-1 max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap min-w-0",
              props.hasFilePath && "cursor-pointer",
            )}
            onClick={handleNameClick}
            onMouseEnter={() => setIsNameHovered(true)}
            onMouseLeave={() => setIsNameHovered(false)}
          >
            <span class="leading-4 overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
              {displayName()}
            </span>
            <Show when={props.hasFilePath}>
              <IconOpen
                size={9}
                class={cn(
                  "text-black/40 transition-all duration-100 shrink-0",
                  isNameHovered()
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-75 -ml-[2px] w-0",
                )}
              />
            </Show>
          </div>
          <Show when={(props.trailCount ?? 0) > 0}>
            <span class="text-[10px] text-black/30 shrink-0 tabular-nums">
              ({props.trailCount})
            </span>
          </Show>
          <button
            data-react-grab-ignore-events
            class="contain-layout shrink-0 flex items-center justify-center cursor-pointer transition-colors press-scale p-0.5 -m-0.5"
            onClick={handleCopyClick}
            aria-label="Copy interaction trail"
          >
            <Show
              when={props.copyStatus === "copied"}
              fallback={
                <IconCopy size={11} class="text-black/30 hover:text-black/60" />
              }
            >
              <IconCheck size={11} class="text-black" />
            </Show>
          </button>
        </div>
      </div>
    </Show>
  );
};
