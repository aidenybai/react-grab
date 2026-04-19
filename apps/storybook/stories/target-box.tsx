import type { Component, JSX } from "solid-js";
import { DEMO_BOUNDS } from "./demo-bounds.js";

export const TargetBox: Component = () => (
  <div
    style={{
      position: "fixed",
      left: `${DEMO_BOUNDS.x}px`,
      top: `${DEMO_BOUNDS.y}px`,
      width: `${DEMO_BOUNDS.width}px`,
      height: `${DEMO_BOUNDS.height}px`,
      border: "1px dashed #c4c4c4",
      "border-radius": DEMO_BOUNDS.borderRadius,
      background: "#fff",
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      color: "#9a9a9a",
      "font-family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      "font-size": "12px",
      "letter-spacing": "0.02em",
    }}
  >
    Target element
  </div>
);

interface CanvasProps {
  children: JSX.Element;
}

export const Canvas: Component<CanvasProps> = (props) => (
  <div
    style={{
      "min-height": "100vh",
      background: "#fafafa",
      "font-family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}
  >
    {props.children}
  </div>
);
