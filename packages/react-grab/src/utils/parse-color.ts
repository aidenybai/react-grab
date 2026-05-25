// Parses a CSS computed color value (always returned by browsers as
// `rgb(r, g, b)` or `rgba(r, g, b, a)`) into a `#rrggbb` or `#rrggbbaa`
// hex string. Returns `null` for unparseable inputs (e.g. gradients).
const NUMERIC_RGB =
  /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/;

const toHexByte = (numericValue: number): string =>
  Math.max(0, Math.min(255, Math.round(numericValue)))
    .toString(16)
    .padStart(2, "0");

const parseHexChannels = (hex: string): { r: number; g: number; b: number; a: number } | null => {
  if (!hex.startsWith("#")) return null;
  const digits = hex.slice(1);
  if (digits.length !== 6 && digits.length !== 8) return null;
  const r = parseInt(digits.slice(0, 2), 16);
  const g = parseInt(digits.slice(2, 4), 16);
  const b = parseInt(digits.slice(4, 6), 16);
  const a = digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1;
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
  return { r, g, b, a };
};

export const rgbStringToHex = (cssValue: string): string | null => {
  const match = cssValue.match(NUMERIC_RGB);
  if (!match) return null;
  const red = toHexByte(Number(match[1]));
  const green = toHexByte(Number(match[2]));
  const blue = toHexByte(Number(match[3]));
  let alpha = 1;
  if (match[4] !== undefined) {
    const rawAlpha = match[4];
    alpha = rawAlpha.endsWith("%") ? Number(rawAlpha.slice(0, -1)) / 100 : Number(rawAlpha);
  }
  if (alpha >= 1) return `#${red}${green}${blue}`;
  return `#${red}${green}${blue}${toHexByte(alpha * 255)}`;
};

// True when the computed color is fully transparent — used to skip the
// default `rgba(0, 0, 0, 0)` background-color that every unset element
// reports, since it would clutter the panel with empty entries.
export const isTransparentRgbString = (cssValue: string): boolean => {
  const match = cssValue.match(NUMERIC_RGB);
  if (!match) return false;
  if (match[4] === undefined) return false;
  const alpha = match[4].endsWith("%") ? Number(match[4].slice(0, -1)) / 100 : Number(match[4]);
  return alpha === 0;
};

interface HslColor {
  h: number;
  s: number;
  l: number;
  a: number;
}

// RGB → HSL via the standard formula. Hue is in degrees (0–360),
// saturation and lightness are in 0–100, alpha is 0–1.
export const hexToHsl = (hex: string): HslColor | null => {
  const channels = parseHexChannels(hex);
  if (!channels) return null;
  const rNorm = channels.r / 255;
  const gNorm = channels.g / 255;
  const bNorm = channels.b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;
  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === rNorm) hue = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) * 60;
    else if (max === gNorm) hue = ((bNorm - rNorm) / delta + 2) * 60;
    else hue = ((rNorm - gNorm) / delta + 4) * 60;
  }
  return { h: hue, s: saturation * 100, l: lightness * 100, a: channels.a };
};

// HSL → RGB → hex. Lossy round-trip (each channel snaps to 0–255).
export const hslToHex = ({ h, s, l, a }: HslColor): string => {
  const saturation = Math.max(0, Math.min(100, s)) / 100;
  const lightness = Math.max(0, Math.min(100, l)) / 100;
  const hue = (((h % 360) + 360) % 360) / 60;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;
  if (hue >= 0 && hue < 1) [rPrime, gPrime, bPrime] = [chroma, x, 0];
  else if (hue < 2) [rPrime, gPrime, bPrime] = [x, chroma, 0];
  else if (hue < 3) [rPrime, gPrime, bPrime] = [0, chroma, x];
  else if (hue < 4) [rPrime, gPrime, bPrime] = [0, x, chroma];
  else if (hue < 5) [rPrime, gPrime, bPrime] = [x, 0, chroma];
  else [rPrime, gPrime, bPrime] = [chroma, 0, x];
  const matchValue = lightness - chroma / 2;
  const red = toHexByte((rPrime + matchValue) * 255);
  const green = toHexByte((gPrime + matchValue) * 255);
  const blue = toHexByte((bPrime + matchValue) * 255);
  if (a >= 1) return `#${red}${green}${blue}`;
  return `#${red}${green}${blue}${toHexByte(a * 255)}`;
};

// Smart step: ±lightnessDelta on the HSL lightness channel, preserving
// hue/sat/alpha. Returns the same color if step is a no-op (already at
// the clamp boundary), so callers can early-out the way numeric tweak
// already does when the rounded value didn't change.
export const stepColorLightness = (hex: string, delta: number): string | null => {
  const hsl = hexToHsl(hex);
  if (!hsl) return null;
  const nextL = Math.max(0, Math.min(100, hsl.l + delta));
  if (nextL === hsl.l) return null;
  return hslToHex({ ...hsl, l: nextL });
};
