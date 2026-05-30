const NUMERIC_RGB =
  /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/;

const toHexByte = (numericValue: number): string =>
  Math.max(0, Math.min(255, Math.round(numericValue)))
    .toString(16)
    .padStart(2, "0");

export const rgbaChannelsToHex = (
  redChannel: number,
  greenChannel: number,
  blueChannel: number,
  alphaChannel = 1,
): string => {
  const red = toHexByte(redChannel);
  const green = toHexByte(greenChannel);
  const blue = toHexByte(blueChannel);
  if (alphaChannel >= 1) return `#${red}${green}${blue}`;
  return `#${red}${green}${blue}${toHexByte(alphaChannel * 255)}`;
};

export const parseHexChannels = (
  hex: string,
): { r: number; g: number; b: number; a: number } | null => {
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
  let alpha = 1;
  if (match[4] !== undefined) {
    const rawAlpha = match[4];
    alpha = rawAlpha.endsWith("%") ? Number(rawAlpha.slice(0, -1)) / 100 : Number(rawAlpha);
  }
  return rgbaChannelsToHex(Number(match[1]), Number(match[2]), Number(match[3]), alpha);
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
