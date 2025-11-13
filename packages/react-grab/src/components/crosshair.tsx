import { Show, createSignal, createEffect, onCleanup, on } from "solid-js";
import type { Component } from "solid-js";
import { lerp } from "../utils/lerp.js";

interface CrosshairProps {
  mouseX: number;
  mouseY: number;
  visible?: boolean;
}

export const Crosshair: Component<CrosshairProps> = (props) => {
  const [currentX, setCurrentX] = createSignal(props.mouseX);
  const [currentY, setCurrentY] = createSignal(props.mouseY);

  let hasBeenRenderedOnce = false;
  let animationFrameId: number | null = null;
  let targetX = props.mouseX;
  let targetY = props.mouseY;
  let isAnimating = false;

  const startAnimation = () => {
    if (isAnimating) return;
    isAnimating = true;

    const animate = () => {
      const interpolatedX = lerp(currentX(), targetX, 0.3);
      const interpolatedY = lerp(currentY(), targetY, 0.3);

      setCurrentX(interpolatedX);
      setCurrentY(interpolatedY);

      const hasConvergedToTarget =
        Math.abs(interpolatedX - targetX) < 0.5 &&
        Math.abs(interpolatedY - targetY) < 0.5;

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
      () => [props.mouseX, props.mouseY] as const,
      ([newMouseX, newMouseY]) => {
        targetX = newMouseX;
        targetY = newMouseY;

        if (!hasBeenRenderedOnce) {
          setCurrentX(targetX);
          setCurrentY(targetY);
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

  return (
    <Show when={props.visible !== false}>
      <div
        style={{
          position: "fixed",
          top: "0",
          left: "0",
          width: "100vw",
          height: "100vh",
          "pointer-events": "none",
          "z-index": "2147483645",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "0",
            left: `${currentX()}px`,
            width: "1px",
            height: "100%",
            "background-color": "rgba(210, 57, 192, 0.5)",
            "will-change": "transform",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: `${currentY()}px`,
            left: "0",
            width: "100%",
            height: "1px",
            "background-color": "rgba(210, 57, 192, 0.5)",
            "will-change": "transform",
          }}
        />
      </div>
    </Show>
  );
};
