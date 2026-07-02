import { describe, expect, it } from "vite-plus/test";
import { OPACITY_PERCENT_MAX } from "../src/constants.js";
import { propertyBounds } from "../src/utils/css-property-bounds.js";
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
} from "../src/utils/property-definitions.js";

describe("propertyBounds", () => {
  it("returns percent bounds for opacity", () => {
    expect(propertyBounds("opacity", 50, "%")).toEqual({
      min: OPACITY_MIN_PERCENT,
      max: OPACITY_PERCENT_MAX,
    });
  });

  it("returns the wide unitless range for z-index", () => {
    expect(propertyBounds("z-index", 10, "")).toEqual({ min: Z_INDEX_MIN, max: Z_INDEX_MAX });
  });

  it("returns letter-spacing, font-size, and line-height ranges", () => {
    expect(propertyBounds("letter-spacing", 0, "px")).toEqual({
      min: LETTER_SPACING_MIN_PX,
      max: LETTER_SPACING_MAX_PX,
    });
    expect(propertyBounds("font-size", 16, "px")).toEqual({
      min: FONT_SIZE_MIN_PX,
      max: FONT_SIZE_MAX_PX,
    });
    expect(propertyBounds("line-height", 24, "px")).toEqual({
      min: LINE_HEIGHT_MIN_PX,
      max: LINE_HEIGHT_MAX_PX,
    });
  });

  it("returns the radius range for any *radius* key", () => {
    expect(propertyBounds("border-radius", 8, "px")).toEqual({
      min: RADIUS_MIN_PX,
      max: RADIUS_MAX_PX,
    });
    expect(propertyBounds("border-top-left-radius", 8, "px")).toEqual({
      min: RADIUS_MIN_PX,
      max: RADIUS_MAX_PX,
    });
  });

  it("scales the size ceiling with the current value for width/height families", () => {
    // Small values keep the fixed fallback ceiling...
    expect(propertyBounds("width", 100, "px")).toEqual({ min: 0, max: SIZE_FALLBACK_MAX_PX });
    expect(propertyBounds("max-height", 100, "px")).toEqual({ min: 0, max: SIZE_FALLBACK_MAX_PX });
    // ...large values widen it so the slider can still reach the value.
    expect(propertyBounds("min-width", 400, "px")).toEqual({
      min: 0,
      max: Math.ceil(400 * SIZE_FALLBACK_MULTIPLIER),
    });
  });

  it("allows negative positions for inset keys", () => {
    expect(propertyBounds("top", 0, "px")).toEqual({ min: POSITION_MIN_PX, max: POSITION_MAX_PX });
    expect(propertyBounds("left", 0, "px")).toEqual({ min: POSITION_MIN_PX, max: POSITION_MAX_PX });
  });

  it("returns the 0–100 percent range when the unit is %", () => {
    expect(propertyBounds("padding-top", 50, "%")).toEqual({
      min: PERCENT_RANGE_MIN,
      max: PERCENT_RANGE_MAX,
    });
  });

  it("falls back to spacing bounds, allowing negatives only for margins", () => {
    expect(propertyBounds("padding-top", 8, "px")).toEqual({
      min: SPACING_MIN_PX,
      max: SPACING_MAX_PX,
    });
    expect(propertyBounds("margin-left", 8, "px")).toEqual({
      min: MARGIN_MIN_PX,
      max: SPACING_MAX_PX,
    });
  });
});
