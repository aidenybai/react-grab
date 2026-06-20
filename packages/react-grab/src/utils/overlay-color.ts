import { supportsDisplayP3 } from "./supports-display-p3.js";
import { supportsHdr } from "./supports-hdr.js";

// On wide-gamut displays (MacBook Pro, recent iPhones) we use Display P3 for
// more vibrant overlay highlights, falling back to sRGB rgba() elsewhere.
// On HDR-capable displays we push the P3 channels past SDR white so the
// highlight emits in the extended (brighter-than-white) range.
const isWideGamut = supportsDisplayP3();
const isHdr = supportsHdr();
const SRGB_COMPONENTS = "210, 57, 192";
const P3_BASE_COMPONENTS = [0.84, 0.19, 0.78] as const;
const HDR_BRIGHTNESS_MULTIPLIER = 1.6;

const p3Brightness = isHdr ? HDR_BRIGHTNESS_MULTIPLIER : 1;
const P3_COMPONENTS = P3_BASE_COMPONENTS.map((channel) => channel * p3Brightness).join(" ");

export const overlayColor = (alpha: number): string =>
  isWideGamut
    ? `color(display-p3 ${P3_COMPONENTS} / ${alpha})`
    : `rgba(${SRGB_COMPONENTS}, ${alpha})`;
