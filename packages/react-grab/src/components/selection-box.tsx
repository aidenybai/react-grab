import { createSignal, createEffect, onCleanup, Show, on } from "solid-js";
import type { Component } from "solid-js";
import type { OverlayBounds } from "../types.js";
import { SELECTION_LERP_FACTOR } from "../constants.js";
import { lerp } from "../utils/lerp.js";
import { cn } from "../utils/cn.js";
import { buildOpenFileUrl } from "../utils/build-open-file-url.js";
import { IconCopy } from "./icon-copy.js";
import { IconOpen } from "./icon-open.js";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

interface SelectionBoxProps {
  variant: "selection" | "grabbed" | "drag" | "processing";
  bounds: OverlayBounds;
  visible?: boolean;
  lerpFactor?: number;
  createdAt?: number;
  filePath?: string;
  lineNumber?: number;
  hideButtons?: boolean;
  isInputExpanded?: boolean;
  onToggleExpand?: () => void;
  onCopyClick?: () => void;
}

export const SelectionBox: Component<SelectionBoxProps> = (props) => {
  const [currentX, setCurrentX] = createSignal(props.bounds.x);
  const [currentY, setCurrentY] = createSignal(props.bounds.y);
  const [currentWidth, setCurrentWidth] = createSignal(props.bounds.width);
  const [currentHeight, setCurrentHeight] = createSignal(props.bounds.height);
  const [opacity, setOpacity] = createSignal(1);
  const [buttonContainerSize, setButtonContainerSize] = createSignal({ width: 0, height: 0 });

  let hasBeenRenderedOnce = false;
  let animationFrameId: number | null = null;
  let fadeTimerId: number | null = null;
  let targetBounds = props.bounds;
  let isAnimating = false;
  let buttonContainerRef: HTMLDivElement | undefined;

  const lerpFactor = () => {
    if (props.lerpFactor !== undefined) return props.lerpFactor;
    if (props.variant === "drag") return 0.7;
    return SELECTION_LERP_FACTOR;
  };

  const startAnimation = () => {
    if (isAnimating) return;
    isAnimating = true;

    const animate = () => {
      const interpolatedX = lerp(currentX(), targetBounds.x, lerpFactor());
      const interpolatedY = lerp(currentY(), targetBounds.y, lerpFactor());
      const interpolatedWidth = lerp(
        currentWidth(),
        targetBounds.width,
        lerpFactor(),
      );
      const interpolatedHeight = lerp(
        currentHeight(),
        targetBounds.height,
        lerpFactor(),
      );

      setCurrentX(interpolatedX);
      setCurrentY(interpolatedY);
      setCurrentWidth(interpolatedWidth);
      setCurrentHeight(interpolatedHeight);

      const hasConvergedToTarget =
        Math.abs(interpolatedX - targetBounds.x) < 0.5 &&
        Math.abs(interpolatedY - targetBounds.y) < 0.5 &&
        Math.abs(interpolatedWidth - targetBounds.width) < 0.5 &&
        Math.abs(interpolatedHeight - targetBounds.height) < 0.5;

      if (!hasConvergedToTarget) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        animationFrameId = null;
        isAnimating = false;
      }
    };

    animationFrameId = requestAnimationFrame(animate);
  };

  createEffect(
    on(
      () => props.bounds,
      (newBounds) => {
        targetBounds = newBounds;

        if (!hasBeenRenderedOnce) {
          setCurrentX(targetBounds.x);
          setCurrentY(targetBounds.y);
          setCurrentWidth(targetBounds.width);
          setCurrentHeight(targetBounds.height);
          hasBeenRenderedOnce = true;
          return;
        }

        startAnimation();
      },
    ),
  );

  createEffect(() => {
    if (props.variant === "grabbed" && props.createdAt) {
      fadeTimerId = window.setTimeout(() => {
        setOpacity(0);
      }, 1500);
    }
  });

  onCleanup(() => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (fadeTimerId !== null) {
      window.clearTimeout(fadeTimerId);
      fadeTimerId = null;
    }
    isAnimating = false;
  });

  const stopEvent = (event: MouseEvent) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
    event.preventDefault();
  };

  const handleOpenClick = (event: MouseEvent) => {
    stopEvent(event);

    if (!props.filePath) return;

    const openFileUrl = buildOpenFileUrl(props.filePath, props.lineNumber);
    window.open(openFileUrl, "_blank");
  };

  const handleToggleClick = (event: MouseEvent) => {
    stopEvent(event);
    props.onToggleExpand?.();
  };

  const handleCopyClick = (event: MouseEvent) => {
    stopEvent(event);
    props.onCopyClick?.();
  };

  const measureButtonContainer = () => {
    if (buttonContainerRef) {
      const { offsetWidth, offsetHeight } = buttonContainerRef;
      setButtonContainerSize({ width: offsetWidth, height: offsetHeight });
    }
  };

  createEffect(
    on(
      () => [props.isInputExpanded, props.filePath],
      () => queueMicrotask(measureButtonContainer),
    ),
  );

  const maxButtonCoverage = 0.25;
  const canFitButtonsInside = () => {
    const { width: buttonWidth, height: buttonHeight } = buttonContainerSize();
    if (buttonWidth === 0 || buttonHeight === 0) return false;
    return (
      currentWidth() >= buttonWidth / maxButtonCoverage &&
      currentHeight() >= buttonHeight / maxButtonCoverage
    );
  };
  const shouldPlaceOutside = () => !canFitButtonsInside();
  const shouldCenterButtons = () => {
    const { width: buttonWidth } = buttonContainerSize();
    return shouldPlaceOutside() && buttonWidth > currentWidth();
  };
  const showButtons = () => !props.hideButtons || props.isInputExpanded;
  const showCopyButton = () => currentWidth() >= 120;
  const modifierKey = isMac ? "⌘" : "Ctrl+";
  const showShortcuts = () => currentWidth() >= 200;

  return (
    <Show when={props.visible !== false}>
      <div
        class={cn(
          "fixed box-border",
          props.variant === "drag" && "pointer-events-none",
          props.variant !== "drag" && "pointer-events-auto",
          props.variant === "grabbed" && "z-2147483645",
          props.variant !== "grabbed" && "z-2147483646",
          props.variant === "drag" &&
            "border border-dashed border-grab-purple/40 bg-grab-purple/5 will-change-[transform,width,height] cursor-crosshair",
          props.variant === "selection" &&
            "border border-dashed border-grab-purple/50 bg-grab-purple/8",
          props.variant === "grabbed" &&
            "border border-solid border-grab-purple bg-grab-purple/8 transition-opacity duration-300 ease-out",
          props.variant === "processing" &&
            "border border-solid border-grab-purple/50 bg-grab-purple/8",
        )}
        style={{
          top: `${currentY()}px`,
          left: `${currentX()}px`,
          width: `${currentWidth()}px`,
          height: `${currentHeight()}px`,
          "border-radius": props.bounds.borderRadius,
          transform: props.bounds.transform,
          opacity: opacity(),
          contain: props.variant === "drag" ? "layout paint size" : undefined,
          overflow: "visible",
        }}
      >
        <Show when={props.variant === "selection" && showButtons()}>
          <Show when={shouldPlaceOutside()}>
            <div class="absolute bottom-full right-0 w-12 h-4" />
          </Show>
          <div
            ref={buttonContainerRef}
            class={cn(
              "absolute flex gap-0.5",
              shouldPlaceOutside()
                ? shouldCenterButtons()
                  ? "bottom-full left-1/2 mb-[-8px] pb-2"
                  : "bottom-full right-0 mb-[-8px] pb-2"
                : "top-1 right-1",
            )}
            style={{
              transform: shouldCenterButtons() ? "translateX(-50%)" : undefined,
            }}
          >
            <Show when={!props.isInputExpanded}>
              <button
                class={cn(
                  "text-[10px] bg-grab-pink/70 text-white cursor-pointer hover:bg-grab-pink transition-all flex items-center py-0.5 px-1",
                  shouldPlaceOutside() ? "rounded-t" : "rounded",
                )}
                onClick={handleToggleClick}
                data-react-grab-toolbar
              >
                Expand <span class="text-white/50 ml-1">⏎</span>
              </button>
            </Show>
            <Show when={props.isInputExpanded}>
              <Show when={showCopyButton()}>
                <button
                  class={cn(
                    "text-[10px] bg-grab-pink/70 text-white cursor-pointer hover:bg-grab-pink transition-all flex items-center px-1 py-0.5 gap-0.5",
                    shouldPlaceOutside() ? "rounded-t" : "rounded",
                  )}
                  onClick={handleCopyClick}
                  data-react-grab-toolbar
                >
                  <IconCopy size={10} />
                  Copy
                </button>
              </Show>
              <Show when={props.filePath}>
                <button
                  class={cn(
                    "text-[10px] bg-grab-pink/70 text-white cursor-pointer hover:bg-grab-pink transition-all flex items-center px-1 py-0.5 gap-0.5",
                    shouldPlaceOutside() ? "rounded-t" : "rounded",
                  )}
                  onClick={handleOpenClick}
                  data-react-grab-toolbar
                >
                  <IconOpen size={10} />
                  Open
                  <Show when={showShortcuts()}>
                    <span class="text-white/50 ml-0.5">{modifierKey}O</span>
                  </Show>
                </button>
              </Show>
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  );
};
