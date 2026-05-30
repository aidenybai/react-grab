import { hexToHsl, parseHexChannels } from "./parse-color.js";
import { TAILWIND_PALETTE, TAILWIND_SHADES } from "./tailwind-palette-data.js";

interface NearestPaletteEntry {
  family: string;
  shade: number;
}

const findNearestPaletteEntry = (hex: string): NearestPaletteEntry | null => {
  const target = parseHexChannels(hex);
  if (!target) return null;
  let bestEntry: NearestPaletteEntry | null = null;
  let bestDistanceSquared = Infinity;
  for (const family of Object.keys(TAILWIND_PALETTE)) {
    const shades = TAILWIND_PALETTE[family];
    for (const shade of TAILWIND_SHADES) {
      const candidate = parseHexChannels(shades[shade]);
      if (!candidate) continue;
      const redDelta = candidate.r - target.r;
      const greenDelta = candidate.g - target.g;
      const blueDelta = candidate.b - target.b;
      const distanceSquared = redDelta * redDelta + greenDelta * greenDelta + blueDelta * blueDelta;
      if (distanceSquared < bestDistanceSquared) {
        bestDistanceSquared = distanceSquared;
        bestEntry = { family, shade };
      }
    }
  }
  return bestEntry;
};

// Snap to the nearest tailwind color, then step one shade in the
// requested direction (+1 = lighter / lower shade number, -1 = darker /
// higher shade number to match the L+/L− convention used by the regular
// arrow keys). Wraps at the family's lightest / darkest end so repeated
// presses cycle through. Returns null when the input isn't parseable as
// hex.
export const stepTailwindShade = (hex: string, direction: 1 | -1): string | null => {
  const nearest = findNearestPaletteEntry(hex);
  if (!nearest) return null;
  const currentIndex = TAILWIND_SHADES.indexOf(nearest.shade as (typeof TAILWIND_SHADES)[number]);
  // direction = 1 (lighter) means MOVING TO A LOWER SHADE NUMBER, so we
  // subtract from the index in the SHADES array.
  const nextIndex = (currentIndex - direction + TAILWIND_SHADES.length) % TAILWIND_SHADES.length;
  const nextShade = TAILWIND_SHADES[nextIndex];
  const nextHex = TAILWIND_PALETTE[nearest.family][nextShade];
  // Preserve alpha from the input (so editing a transparent overlay
  // doesn't drop its transparency when snapping to a palette entry).
  const inputHsl = hexToHsl(hex);
  if (inputHsl && inputHsl.a < 1) {
    const alphaByte = Math.round(inputHsl.a * 255)
      .toString(16)
      .padStart(2, "0");
    return `${nextHex}${alphaByte}`;
  }
  return nextHex;
};
