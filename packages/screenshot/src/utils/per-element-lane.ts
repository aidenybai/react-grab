import type { StyleDeclarationMap } from "../types";

export const PER_ELEMENT_LANE_READ = 0;
export const PER_ELEMENT_LANE_INLINE_SIZE = 1;
export const PER_ELEMENT_LANE_BLOCK_SIZE = 2;
export const PER_ELEMENT_LANE_TRANSFORM_ORIGIN = 3;
export const PER_ELEMENT_LANE_PERSPECTIVE_ORIGIN = 4;
export const PER_ELEMENT_LANE_GRID_TEMPLATE = 5;
export const PER_ELEMENT_LANE_INSET = 6;
export const PER_ELEMENT_LANE_SIZE = 7;

const INSET_PROPERTY_NAMES = new Set(["top", "right", "bottom", "left"]);
const SIZE_PROPERTY_NAMES = new Set(["width", "height"]);

export const buildPerElementLaneActions = (
  perElementPropertyNames: readonly string[],
): number[] => {
  // Gating grid-template reads on the memoized display is only sound when
  // display itself cannot vary within a memo class (i.e. is not animated into
  // the per-element lane).
  const hasPerElementDisplay = perElementPropertyNames.includes("display");
  const hasPerElementPosition = perElementPropertyNames.includes("position");
  return perElementPropertyNames.map((propertyName) => {
    if (propertyName === "inline-size") return PER_ELEMENT_LANE_INLINE_SIZE;
    if (propertyName === "block-size") return PER_ELEMENT_LANE_BLOCK_SIZE;
    if (propertyName === "transform-origin") return PER_ELEMENT_LANE_TRANSFORM_ORIGIN;
    if (propertyName === "perspective-origin") return PER_ELEMENT_LANE_PERSPECTIVE_ORIGIN;
    if (
      !hasPerElementDisplay &&
      (propertyName === "grid-template-columns" || propertyName === "grid-template-rows")
    ) {
      return PER_ELEMENT_LANE_GRID_TEMPLATE;
    }
    if (!hasPerElementPosition && INSET_PROPERTY_NAMES.has(propertyName)) {
      return PER_ELEMENT_LANE_INSET;
    }
    if (!hasPerElementDisplay && SIZE_PROPERTY_NAMES.has(propertyName)) {
      return PER_ELEMENT_LANE_SIZE;
    }
    return PER_ELEMENT_LANE_READ;
  });
};

// Skips per-element getPropertyValue reads whose value is derivable from ones
// already read: inline/block-size mirror width/height in horizontal-tb writing
// mode, and the box-relative origins are paint-irrelevant while their driving
// property (transform / perspective) is none. The lane order in
// PER_ELEMENT_SNAPSHOT_STYLE_PROPS guarantees width/height/transform are
// assigned before the properties derived from them.
export const applyPerElementLaneReads = (
  targetStyles: StyleDeclarationMap,
  computedStyle: CSSStyleDeclaration,
  perElementPropertyNames: readonly string[],
  laneActions: readonly number[],
  laneSkipMask: readonly boolean[] | null = null,
  isNonReplacedBox = false,
): void => {
  for (let laneIndex = 0; laneIndex < perElementPropertyNames.length; laneIndex++) {
    if (laneSkipMask !== null && laneSkipMask[laneIndex]) continue;
    const laneAction = laneActions[laneIndex];
    if (laneAction !== PER_ELEMENT_LANE_READ) {
      if (laneAction === PER_ELEMENT_LANE_INLINE_SIZE) {
        if (targetStyles["writing-mode"] === "horizontal-tb") {
          targetStyles["inline-size"] = targetStyles["width"];
          continue;
        }
      } else if (laneAction === PER_ELEMENT_LANE_BLOCK_SIZE) {
        if (targetStyles["writing-mode"] === "horizontal-tb") {
          targetStyles["block-size"] = targetStyles["height"];
          continue;
        }
      } else if (laneAction === PER_ELEMENT_LANE_TRANSFORM_ORIGIN) {
        if (targetStyles["transform"] === "none") continue;
      } else if (laneAction === PER_ELEMENT_LANE_PERSPECTIVE_ORIGIN) {
        if ((targetStyles["perspective"] ?? "none") === "none") continue;
      } else if (laneAction === PER_ELEMENT_LANE_INSET) {
        // Inset values only affect paint on positioned boxes; for a
        // class-pinned static position the seed's value delegates through
        // harmlessly.
        if ((targetStyles["position"] ?? "static") === "static") continue;
      } else if (laneAction === PER_ELEMENT_LANE_SIZE) {
        // Size freezing deletes width/height for non-replaced inline boxes,
        // so their per-element reads are pure waste.
        if (isNonReplacedBox && targetStyles["display"] === "inline") continue;
      } else if (!(targetStyles["display"] ?? "").includes("grid")) {
        continue;
      }
    }
    const propertyName = perElementPropertyNames[laneIndex];
    const propertyValue = computedStyle.getPropertyValue(propertyName);
    const normalizedValue = propertyValue !== "" ? propertyValue : undefined;
    // Values matching the seed's (visible through the prototype) are skipped
    // so memo-hit maps keep only true deviations as own properties, keeping
    // variant keys short and dictionary-mode writes rare.
    if (targetStyles[propertyName] !== normalizedValue) {
      targetStyles[propertyName] = normalizedValue;
    }
  }
};
