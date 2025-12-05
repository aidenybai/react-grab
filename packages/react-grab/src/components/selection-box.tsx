import { createSignal, createEffect, onCleanup, Show, on } from "solid-js";
import type { Component } from "solid-js";
import type { OverlayBounds } from "../types.js";
import { SELECTION_LERP_FACTOR } from "../constants.js";
import { lerp } from "../utils/lerp.js";
import { cn } from "../utils/cn.js";

interface SelectionBoxProps {
  variant: "selection" | "grabbed" | "drag" | "processing";
  bounds: OverlayBounds;
  visible?: boolean;
  lerpFactor?: number;
  createdAt?: number;
  isFading?: boolean;
  isCompleted?: boolean;
}

export const SelectionBox: Component<SelectionBoxProps> = (props) => {
  const [currentX, setCurrentX] = createSignal(props.bounds.x);
  const [currentY, setCurrentY] = createSignal(props.bounds.y);
  const [currentWidth, setCurrentWidth] = createSignal(props.bounds.width);
  const [currentHeight, setCurrentHeight] = createSignal(props.bounds.height);
  const [opacity, setOpacity] = createSignal(1);

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
            "border border-solid border-grab-purple/40 bg-grab-purple/5 will-change-[transform,width,height] cursor-crosshair",
          props.variant === "selection" &&
            "border border-solid border-grab-purple/50 bg-grab-purple/8 transition-opacity duration-100 ease-out",
          props.variant === "grabbed" && "border border-solid react-grab-flash",
          props.variant === "processing" &&
            !props.isCompleted &&
            "border border-solid border-grab-purple/50 bg-grab-purple/8",
          props.variant === "processing" &&
            props.isCompleted &&
            "border border-solid react-grab-flash",
        )}
        style={{
          top: `${currentY()}px`,
          left: `${currentX()}px`,
          width: `${currentWidth()}px`,
          height: `${currentHeight()}px`,
          "border-radius": props.bounds.borderRadius,
          transform: props.bounds.transform,
          opacity: props.isFading ? 0 : opacity(),
          contain: props.variant === "drag" ? "layout paint size" : undefined,
          overflow: "visible",
        }}
      />
    </Show>
  );
};
