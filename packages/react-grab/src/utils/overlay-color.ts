import { supportsDisplayP3 } from "./supports-display-p3.js";

const isWideGamut = supportsDisplayP3();
const SRGB_COMPONENTS = "210, 57, 192";
const P3_COMPONENTS = "0.84 0.19 0.78";

export const overlayColor = (alpha: number): string =>
  isWideGamut
    ? `color(display-p3 ${P3_COMPONENTS} / ${alpha})`
    : `rgba(${SRGB_COMPONENTS}, ${alpha})`;
