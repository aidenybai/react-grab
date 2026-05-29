import { OPACITY_PERCENT_MAX } from "../constants.js";
import {
  FONT_SIZE_MAX_PX,
  FONT_SIZE_MIN_PX,
  LETTER_SPACING_MAX_PX,
  LETTER_SPACING_MIN_PX,
  LINE_HEIGHT_MAX_PX,
  LINE_HEIGHT_MIN_PX,
  MARGIN_MIN_PX,
  OPACITY_MIN_PERCENT,
  PERCENT_RANGE_MAX,
  PERCENT_RANGE_MIN,
  POSITION_KEYS,
  POSITION_MAX_PX,
  POSITION_MIN_PX,
  RADIUS_MAX_PX,
  RADIUS_MIN_PX,
  SIZE_FALLBACK_MAX_PX,
  SIZE_FALLBACK_MULTIPLIER,
  SPACING_MAX_PX,
  SPACING_MIN_PX,
  Z_INDEX_MAX,
  Z_INDEX_MIN,
} from "./property-definitions.js";

export interface PropertyBounds {
  min: number;
  max: number;
}

export const propertyBounds = (
  propertyKey: string,
  value: number,
  unit: string,
): PropertyBounds => {
  if (propertyKey === "opacity") return { min: OPACITY_MIN_PERCENT, max: OPACITY_PERCENT_MAX };
  if (propertyKey === "z-index") return { min: Z_INDEX_MIN, max: Z_INDEX_MAX };
  if (propertyKey === "letter-spacing") {
    return { min: LETTER_SPACING_MIN_PX, max: LETTER_SPACING_MAX_PX };
  }
  if (propertyKey === "font-size") return { min: FONT_SIZE_MIN_PX, max: FONT_SIZE_MAX_PX };
  if (propertyKey === "line-height") return { min: LINE_HEIGHT_MIN_PX, max: LINE_HEIGHT_MAX_PX };
  if (propertyKey.includes("radius")) return { min: RADIUS_MIN_PX, max: RADIUS_MAX_PX };
  if (
    propertyKey === "width" ||
    propertyKey === "height" ||
    propertyKey.startsWith("min-") ||
    propertyKey.startsWith("max-")
  ) {
    return {
      min: 0,
      max: Math.max(SIZE_FALLBACK_MAX_PX, Math.ceil(value * SIZE_FALLBACK_MULTIPLIER)),
    };
  }
  // Positioning (top/right/bottom/left and their inset aggregates) needs
  // the negative half because overlays often live at `top: -8px` etc.
  if (POSITION_KEYS.has(propertyKey)) return { min: POSITION_MIN_PX, max: POSITION_MAX_PX };
  if (unit === "%") return { min: PERCENT_RANGE_MIN, max: PERCENT_RANGE_MAX };
  return {
    min: propertyKey.startsWith("margin") ? MARGIN_MIN_PX : SPACING_MIN_PX,
    max: SPACING_MAX_PX,
  };
};
