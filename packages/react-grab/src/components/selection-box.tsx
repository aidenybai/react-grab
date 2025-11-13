import {
  createSignal,
  createEffect,
  onCleanup,
  Show,
  onMount,
  on,
} from "solid-js";
import type { JSX, Component } from "solid-js";
import type { OverlayBounds } from "../types.js";
import {
  SELECTION_LERP_FACTOR,
} from "../constants.js";
import { lerp } from "../utils/lerp.js";

interface SelectionBoxProps {
  variant: "selection" | "grabbed" | "drag";
  bounds: OverlayBounds;
  visible?: boolean;
  lerpFactor?: number;
}

export const SelectionBox: Component<SelectionBoxProps> = (props) => {
  const [currentX, setCurrentX] = createSignal(props.bounds.x);
  const [currentY, setCurrentY] = createSignal(props.bounds.y);
  const [currentWidth, setCurrentWidth] = createSignal(props.bounds.width);
  const [currentHeight, setCurrentHeight] = createSignal(props.bounds.height);
  const [opacity, setOpacity] = createSignal(1);

  let hasBeenRenderedOnce = false;
  let animationFrameId: number | null = null;
  let targetBounds = props.bounds;
  let isAnimating = false;

  onMount(() => {
    if (props.variant === "grabbed") {
      requestAnimationFrame(() => {
        setOpacity(0);
      });
    }
  });

  const lerpFactor = () => {
    if (props.lerpFactor !== undefined) return props.lerpFactor;
    if (props.variant === "drag") return 0.9;
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

  onCleanup(() => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    isAnimating = false;
  });

  const baseStyle: JSX.CSSProperties = {
    position: "fixed",
    "box-sizing": "border-box",
    "pointer-events": props.variant === "drag" ? "none" : "auto",
    "z-index": "2147483646",
  };

  const variantStyle = (): JSX.CSSProperties => {
    if (props.variant === "drag") {
      return {
        border: "1px dashed rgb(210, 57, 192)",
        "background-color": "rgba(210, 57, 192, 0.15)",
        "will-change": "transform, width, height",
        contain: "layout paint size",
        cursor: "crosshair",
      };
    }

    return {
      border: "1px solid rgb(210, 57, 192)",
      "background-color": "rgba(210, 57, 192, 0.2)",
      transition:
        props.variant === "grabbed" ? "opacity 0.3s ease-out" : undefined,
    };
  };

  return (
    <Show when={props.visible !== false}>
      <div
        style={{
          ...baseStyle,
          ...variantStyle(),
          top: `${currentY()}px`,
          left: `${currentX()}px`,
          width: `${currentWidth()}px`,
          height: `${currentHeight()}px`,
          "border-radius": props.bounds.borderRadius,
          transform: props.bounds.transform,
          opacity: opacity(),
        }}
      />
    </Show>
  );
};
