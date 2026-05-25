import { rgbStringToHex } from "./parse-color.js";

// Accepts `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa` (with or without
// the leading `#`). Shorthand forms expand to the long form so the
// rest of the pipeline can assume `#rrggbb[aa]` exclusively.
const HEX_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const normalizeHex = (raw: string): string | null => {
  const match = raw.match(HEX_PATTERN);
  if (!match) return null;
  const digits = match[1];
  if (digits.length === 3) {
    return `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`;
  }
  if (digits.length === 4) {
    return `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}${digits[3]}${digits[3]}`;
  }
  return `#${digits}`;
};

// Sentinel used to detect when canvas rejects the assigned colour. If
// `fillStyle` reflects this exact string back after assignment, the
// user input is either fully-transparent black OR was rejected — the
// caller disambiguates from the input form.
const REJECTED_FILL_STYLE_SENTINEL = "rgba(0, 0, 0, 0)";
const TRANSPARENT_BLACK_HEX = "#00000000";
const OPAQUE_HEX_LENGTH = 7;

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
  context.fillStyle = REJECTED_FILL_STYLE_SENTINEL;
  context.fillStyle = trimmed;
  const resolved = context.fillStyle;
  if (typeof resolved !== "string") return null;
  if (resolved.toLowerCase() === REJECTED_FILL_STYLE_SENTINEL) {
    // Sentinel came back unchanged — input was either rejected OR is
    // itself fully-transparent black. The input form disambiguates.
    return trimmed.toLowerCase().replace(/\s+/g, "") === "rgba(0,0,0,0)"
      ? TRANSPARENT_BLACK_HEX
      : null;
  }
  if (resolved.startsWith("#") && resolved.length === OPAQUE_HEX_LENGTH) return resolved;
  if (resolved.startsWith("rgb")) return rgbStringToHex(resolved);
  return null;
};
