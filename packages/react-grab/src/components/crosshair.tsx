import { Show, createEffect, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import { lerp } from "../utils/lerp.js";

interface CrosshairProps {
  mouseX: number;
  mouseY: number;
  visible?: boolean;
}

export const Crosshair: Component<CrosshairProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;
  let context: CanvasRenderingContext2D | null = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let currentX = props.mouseX;
  let currentY = props.mouseY;
  let targetX = props.mouseX;
  let targetY = props.mouseY;
  let animationFrameId: number | null = null;
  let hasBeenRenderedOnce = false;

  const setupCanvas = () => {
    if (!canvasRef) return;

    dpr = Math.max(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvasRef.width = width * dpr;
    canvasRef.height = height * dpr;
    canvasRef.style.width = `${width}px`;
    canvasRef.style.height = `${height}px`;

    context = canvasRef.getContext("2d");
    if (context) {
      context.scale(dpr, dpr);
    }
  };

  const render = () => {
    if (!context) return;

    context.clearRect(0, 0, width, height);

    context.strokeStyle = "rgba(210, 57, 192)";
    context.lineWidth = 1;

    context.beginPath();
    context.moveTo(currentX, 0);
    context.lineTo(currentX, height);
    context.moveTo(0, currentY);
    context.lineTo(width, currentY);
    context.stroke();
  };

  const animate = () => {
    currentX = lerp(currentX, targetX, 0.3);
    currentY = lerp(currentY, targetY, 0.3);

    render();

    const hasConvergedToTarget =
      Math.abs(currentX - targetX) < 0.5 &&
      Math.abs(currentY - targetY) < 0.5;

    if (!hasConvergedToTarget) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      animationFrameId = null;
    }
  };

  const startAnimation = () => {
    if (animationFrameId !== null) return;
    animationFrameId = requestAnimationFrame(animate);
  };

  const updateTarget = () => {
    targetX = props.mouseX;
    targetY = props.mouseY;

    if (!hasBeenRenderedOnce) {
      currentX = targetX;
      currentY = targetY;
      hasBeenRenderedOnce = true;
      render();
      return;
    }

    startAnimation();
  };

  createEffect(() => {
    setupCanvas();
    render();

    const handleResize = () => {
      setupCanvas();
      render();
    };

    window.addEventListener("resize", handleResize);

    onCleanup(() => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    });
  });

  createEffect(() => {
    updateTarget();
  });

  return (
    <Show when={props.visible !== false}>
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: "0",
          left: "0",
          "pointer-events": "none",
          "z-index": "2147483645",
        }}
      />
    </Show>
  );
};
