import type { OverlayBounds } from "react-grab/src/types.js";

const DEMO_WIDTH = 220;
const DEMO_HEIGHT = 40;
const FALLBACK_VIEWPORT_WIDTH = 1024;
const FALLBACK_VIEWPORT_HEIGHT = 640;

const viewportWidth = typeof window === "undefined" ? FALLBACK_VIEWPORT_WIDTH : window.innerWidth;
const viewportHeight =
  typeof window === "undefined" ? FALLBACK_VIEWPORT_HEIGHT : window.innerHeight;

export const DEMO_BOUNDS: OverlayBounds = {
  x: Math.round((viewportWidth - DEMO_WIDTH) / 2),
  y: Math.round((viewportHeight - DEMO_HEIGHT) / 2),
  width: DEMO_WIDTH,
  height: DEMO_HEIGHT,
  borderRadius: "8px",
  transform: "",
};

export const DEMO_MOUSE_X = DEMO_BOUNDS.x + DEMO_BOUNDS.width / 2;
