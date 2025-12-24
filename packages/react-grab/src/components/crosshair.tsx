import { Show, createEffect, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import { useAnimatedPosition } from "../utils/use-animated-position.js";

const CROSSHAIR_COLOR = "rgba(210, 57, 192)";
const CROSSHAIR_LERP_FACTOR = 0.3;

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

  const position = useAnimatedPosition({
    x: () => props.mouseX,
    y: () => props.mouseY,
    lerpFactor: CROSSHAIR_LERP_FACTOR,
  });

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

    context.strokeStyle = CROSSHAIR_COLOR;
    context.lineWidth = 1;

    context.beginPath();
    context.moveTo(position.x(), 0);
    context.lineTo(position.x(), height);
    context.moveTo(0, position.y());
    context.lineTo(width, position.y());
    context.stroke();
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
    });
  });

  createEffect(() => {
    position.x();
    position.y();
    render();
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
