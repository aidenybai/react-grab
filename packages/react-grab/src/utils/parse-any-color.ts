import { EDIT_TRANSPARENT_COLOR_HEX } from "../constants.js";
import { rgbaChannelsToHex, rgbStringToHex } from "./parse-color.js";

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
const OPAQUE_HEX_LENGTH = 7;
const OKLCH_PATTERN =
  /^oklch\(\s*([+-]?\d*\.?\d+%?)\s+([+-]?\d*\.?\d+%?)\s+([+-]?\d*\.?\d+)(deg|grad|rad|turn)?(?:\s*\/\s*([+-]?\d*\.?\d+%?))?\s*\)$/i;
const OKLCH_PERCENT_CHROMA_SCALE = 0.004;
const DEGREES_PER_GRAD = 0.9;
const DEGREES_PER_RADIAN = 180 / Math.PI;
const DEGREES_PER_TURN = 360;
const SRGB_GAMMA_THRESHOLD = 0.0031308;
const SRGB_GAMMA_LINEAR_MULTIPLIER = 12.92;
const SRGB_GAMMA_POWER_MULTIPLIER = 1.055;
const SRGB_GAMMA_OFFSET = 0.055;
const SRGB_CHANNEL_MAX = 255;

const parsePercentOrNumber = (value: string, percentScale: number): number => {
  if (value.endsWith("%")) return (Number(value.slice(0, -1)) / 100) * percentScale;
  return Number(value);
};

const parseHueDegrees = (rawHue: string, unit: string | undefined): number => {
  const hue = Number(rawHue);
  if (unit === "grad") return hue * DEGREES_PER_GRAD;
  if (unit === "rad") return hue * DEGREES_PER_RADIAN;
  if (unit === "turn") return hue * DEGREES_PER_TURN;
  return hue;
};

const gammaEncodeSrgb = (linearChannel: number): number => {
  const clamped = Math.max(0, Math.min(1, linearChannel));
  const encoded =
    clamped <= SRGB_GAMMA_THRESHOLD
      ? clamped * SRGB_GAMMA_LINEAR_MULTIPLIER
      : SRGB_GAMMA_POWER_MULTIPLIER * clamped ** (1 / 2.4) - SRGB_GAMMA_OFFSET;
  return encoded * SRGB_CHANNEL_MAX;
};

const oklchStringToHex = (cssValue: string): string | null => {
  const match = cssValue.match(OKLCH_PATTERN);
  if (!match) return null;
  const lightness = parsePercentOrNumber(match[1], 1);
  const chroma = parsePercentOrNumber(match[2], OKLCH_PERCENT_CHROMA_SCALE);
  const hueRadians = (parseHueDegrees(match[3], match[4]) * Math.PI) / 180;
  const alpha = match[5] === undefined ? 1 : parsePercentOrNumber(match[5], 1);
  if (![lightness, chroma, hueRadians, alpha].every(Number.isFinite)) return null;

  const okLabA = chroma * Math.cos(hueRadians);
  const okLabB = chroma * Math.sin(hueRadians);
  const longConeResponse = lightness + 0.3963377774 * okLabA + 0.2158037573 * okLabB;
  const mediumConeResponse = lightness - 0.1055613458 * okLabA - 0.0638541728 * okLabB;
  const shortConeResponse = lightness - 0.0894841775 * okLabA - 1.291485548 * okLabB;
  const longCone = longConeResponse ** 3;
  const mediumCone = mediumConeResponse ** 3;
  const shortCone = shortConeResponse ** 3;

  const redLinear = 4.0767416621 * longCone - 3.3077115913 * mediumCone + 0.2309699292 * shortCone;
  const greenLinear =
    -1.2684380046 * longCone + 2.6097574011 * mediumCone - 0.3413193965 * shortCone;
  const blueLinear = -0.0041960863 * longCone - 0.7034186147 * mediumCone + 1.707614701 * shortCone;

  return rgbaChannelsToHex(
    gammaEncodeSrgb(redLinear),
    gammaEncodeSrgb(greenLinear),
    gammaEncodeSrgb(blueLinear),
    Math.max(0, Math.min(1, alpha)),
  );
};

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
  const trimmedColorInput = input.trim();
  if (!trimmedColorInput) return null;

  // CSS-wide `transparent` keyword. Canvas resolves it to
  // `rgba(0,0,0,0)` — same string as the rejection sentinel — so
  // without this allow-list it'd fall through to null and silently
  // refuse a perfectly valid color.
  if (trimmedColorInput.toLowerCase() === "transparent") return EDIT_TRANSPARENT_COLOR_HEX;

  const directHex = normalizeHex(trimmedColorInput);
  if (directHex) return directHex;

  const oklchHex = oklchStringToHex(trimmedColorInput);
  if (oklchHex) return oklchHex;

  const canvasContext2d = getCanvasContext();
  if (!canvasContext2d) return null;
  canvasContext2d.fillStyle = REJECTED_FILL_STYLE_SENTINEL;
  canvasContext2d.fillStyle = trimmedColorInput;
  const resolved = canvasContext2d.fillStyle;
  if (typeof resolved !== "string") return null;
  if (resolved.toLowerCase() === REJECTED_FILL_STYLE_SENTINEL) {
    // Sentinel came back unchanged — input was either rejected OR is
    // itself fully-transparent black. The input form disambiguates.
    return trimmedColorInput.toLowerCase().replace(/\s+/g, "") === "rgba(0,0,0,0)"
      ? EDIT_TRANSPARENT_COLOR_HEX
      : null;
  }
  if (resolved.startsWith("#") && resolved.length === OPAQUE_HEX_LENGTH) return resolved;
  if (resolved.startsWith("rgb")) return rgbStringToHex(resolved);
  return null;
};
