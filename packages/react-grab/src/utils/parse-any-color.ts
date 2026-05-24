import { normalizeHex } from "./normalize-hex.js";
import { rgbStringToHex } from "./parse-color.js";

// Defer color parsing to a 2D canvas context so we get the browser's
// full CSS color grammar for free: named colors (red, dodgerblue),
// `rgb()` / `rgba()` (legacy + space-separated), `hsl()` / `hsla()`,
// `hwb()`, `color()`, etc. Canvas normalizes opaque colors to `#rrggbb`
// and transparent to `rgba(r, g, b, a)`, both of which our hex pipeline
// can ingest. The canvas itself is created once and reused.
let canvasContext: CanvasRenderingContext2D | null = null;
const getCanvasContext = (): CanvasRenderingContext2D | null => {
  if (canvasContext) return canvasContext;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvasContext = canvas.getContext("2d");
  return canvasContext;
};

export const parseAnyColor = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Fast path: already-valid hex (with or without `#`, 3/4/6/8 digit).
  const directHex = normalizeHex(trimmed);
  if (directHex) return directHex;

  const context = getCanvasContext();
  if (!context) return null;
  // Reset to a sentinel that canvas rejects, then assign the user input.
  // If canvas accepted it, `fillStyle` will be the normalized form;
  // otherwise it stays as the sentinel and we treat the input as invalid.
  const sentinel = "rgba(0, 0, 0, 0)";
  context.fillStyle = sentinel;
  context.fillStyle = trimmed;
  const resolved = context.fillStyle;
  if (typeof resolved !== "string") return null;
  if (resolved.toLowerCase() === sentinel) {
    // Could mean the input actually IS fully-transparent black, OR the
    // input was invalid. Distinguish by checking whether the input
    // itself parses to that color.
    return trimmed.toLowerCase().replace(/\s+/g, "") === "rgba(0,0,0,0)"
      ? "#00000000"
      : null;
  }
  if (resolved.startsWith("#") && resolved.length === 7) return resolved;
  if (resolved.startsWith("rgb")) return rgbStringToHex(resolved);
  return null;
};
