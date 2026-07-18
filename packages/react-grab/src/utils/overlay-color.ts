import { supportsDisplayP3 } from "./supports-display-p3.js";
import { supportsHdr } from "./supports-hdr.js";

// On wide-gamut displays (MacBook Pro, recent iPhones) we use Display P3 for
// more vibrant overlay highlights, falling back to sRGB rgba() elsewhere.
// `extendedRange` is opt-in for the float16 HDR canvas layers only: it pushes
// the P3 channels far past SDR white so the highlight blows out in the extended
// range (intentionally driving the compositor to dim the rest of the page). It
// must NOT be set for plain-CSS consumers (e.g. box-shadow), which would
// gamut-clamp the out-of-range channels into a distorted hue.
const isWideGamut = supportsDisplayP3();
const isHdr = supportsHdr();
const SRGB_COMPONENTS = "210, 57, 192";
const P3_BASE_COMPONENTS = [0.84, 0.19, 0.78] as const;
const HDR_BRIGHTNESS_MULTIPLIER = 4;

export const overlayColor = (alpha: number, extendedRange = false): string => {
  if (!isWideGamut) return `rgba(${SRGB_COMPONENTS}, ${alpha})`;

  const multiplier = extendedRange && isHdr ? HDR_BRIGHTNESS_MULTIPLIER : 1;
  const components = P3_BASE_COMPONENTS.map((channel) =>
    Number((channel * multiplier).toFixed(4)),
  ).join(" ");

  return `color(display-p3 ${components} / ${alpha})`;
};
