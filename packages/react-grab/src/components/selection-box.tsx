import {
  createSignal,
  createEffect,
  onCleanup,
  Show,
  on,
} from "solid-js";
import type { Component } from "solid-js";
import type { OverlayBounds } from "../types.js";
import {
  SELECTION_LERP_FACTOR,
} from "../constants.js";
import { lerp } from "../utils/lerp.js";
import { cn } from "../utils/cn.js";
import { IconCopy } from "./icon-copy.js";
import { IconOpen } from "./icon-open.js";
import { IconCursor } from "./icon-cursor.js";
import { IconVSCode } from "./icon-vscode.js";
import { IconZed } from "./icon-zed.js";
import { IconWebStorm } from "./icon-webstorm.js";

type Editor = "cursor" | "vscode" | "zed" | "webstorm";

interface SelectionBoxProps {
  variant: "selection" | "grabbed" | "drag";
  bounds: OverlayBounds;
  visible?: boolean;
  lerpFactor?: number;
  createdAt?: number;
  filePath?: string;
  lineNumber?: number;
}

export const SelectionBox: Component<SelectionBoxProps> = (props) => {
  const [currentX, setCurrentX] = createSignal(props.bounds.x);
  const [currentY, setCurrentY] = createSignal(props.bounds.y);
  const [currentWidth, setCurrentWidth] = createSignal(props.bounds.width);
  const [currentHeight, setCurrentHeight] = createSignal(props.bounds.height);
  const [opacity, setOpacity] = createSignal(1);
  const [showOpenDropdown, setShowOpenDropdown] = createSignal(false);

  let hasBeenRenderedOnce = false;
  let animationFrameId: number | null = null;
  let fadeTimerId: number | null = null;
  let targetBounds = props.bounds;
  let isAnimating = false;

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
        setShowOpenDropdown(false);

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
    setShowOpenDropdown(!showOpenDropdown());
  };

  const handleOpenInEditor = (editor: Editor) => (event: MouseEvent) => {
    stopEvent(event);
    setShowOpenDropdown(false);

    if (!props.filePath) return;

    if (editor === "webstorm") {
      const lineParam = props.lineNumber ? `&line=${props.lineNumber}` : "";
      window.open(`webstorm://open?file=${props.filePath}${lineParam}`, "_blank");
      return;
    }

    const lineParam = props.lineNumber ? `:${props.lineNumber}` : "";
    const filePath = `${props.filePath}${lineParam}`;
    window.open(`${editor}://file/${filePath}`, "_blank");
  };

  const showFullButton = () => currentWidth() >= 100 && currentHeight() >= 30;
  const showIconOnly = () => currentWidth() >= 45 && currentHeight() >= 26;

  return (
    <Show when={props.visible !== false}>
      <div
        class={cn(
          "fixed box-border",
          props.variant === "drag" && "pointer-events-none",
          props.variant !== "drag" && "pointer-events-auto",
          props.variant === "grabbed" && "z-2147483645",
          props.variant !== "grabbed" && "z-2147483646",
          props.variant === "drag" && "border border-dashed border-grab-purple/40 bg-grab-purple/5 will-change-[transform,width,height] cursor-crosshair",
          props.variant === "selection" && "border border-dashed border-grab-purple/50 bg-grab-purple/8",
          props.variant === "grabbed" && "border border-solid border-grab-purple bg-grab-purple/8 transition-opacity duration-300 ease-out"
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
        }}
      >
        <Show when={props.variant === "selection" && showIconOnly()}>
          <div class="absolute top-1 right-1 flex gap-0.5">
            <button
              class={cn(
                "text-[10px] font-medium bg-grab-pink-light text-grab-pink border border-grab-pink-border rounded cursor-pointer hover:bg-grab-pink-border transition-colors flex items-center",
                showFullButton() ? "px-1 py-px gap-0.5" : "p-px"
              )}
            >
              <IconCopy size={10} />
              <Show when={showFullButton()}>Copy</Show>
            </button>
            <div class="relative" data-react-grab-toolbar onMouseDown={stopEvent}>
              <button
                class={cn(
                  "text-[10px] font-medium bg-grab-pink-light text-grab-pink border border-grab-pink-border rounded cursor-pointer hover:bg-grab-pink-border transition-colors flex items-center",
                  showFullButton() ? "px-1 py-px gap-0.5" : "p-px"
                )}
                onClick={handleOpenClick}
              >
                <IconOpen size={10} />
                <Show when={showFullButton()}>Open</Show>
              </button>
              <Show when={showOpenDropdown()}>
                <div
                  class="absolute top-full right-0 mt-0.5 bg-grab-pink-light border border-grab-pink-border rounded shadow-lg overflow-hidden min-w-[80px] z-2147483647"
                  data-react-grab-toolbar
                >
                  <button
                    class="w-full px-2 py-1 text-[10px] font-medium text-grab-pink hover:bg-grab-pink-border transition-colors flex items-center gap-1 cursor-pointer"
                    onClick={handleOpenInEditor("cursor")}
                  >
                    <IconCursor size={10} />
                    Cursor
                  </button>
                  <button
                    class="w-full px-2 py-1 text-[10px] font-medium text-grab-pink hover:bg-grab-pink-border transition-colors flex items-center gap-1 cursor-pointer"
                    onClick={handleOpenInEditor("vscode")}
                  >
                    <IconVSCode size={10} />
                    VS Code
                  </button>
                  <button
                    class="w-full px-2 py-1 text-[10px] font-medium text-grab-pink hover:bg-grab-pink-border transition-colors flex items-center gap-1 cursor-pointer"
                    onClick={handleOpenInEditor("zed")}
                  >
                    <IconZed size={10} />
                    Zed
                  </button>
                  <button
                    class="w-full px-2 py-1 text-[10px] font-medium text-grab-pink hover:bg-grab-pink-border transition-colors flex items-center gap-1 cursor-pointer"
                    onClick={handleOpenInEditor("webstorm")}
                  >
                    <IconWebStorm size={10} />
                    WebStorm
                  </button>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
};
