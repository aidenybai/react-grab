import type { StyleDeclarationMap } from "../types";

export const PER_ELEMENT_LANE_READ = 0;
export const PER_ELEMENT_LANE_INLINE_SIZE = 1;
export const PER_ELEMENT_LANE_BLOCK_SIZE = 2;
export const PER_ELEMENT_LANE_TRANSFORM_ORIGIN = 3;
export const PER_ELEMENT_LANE_PERSPECTIVE_ORIGIN = 4;

export const buildPerElementLaneActions = (
  perElementPropertyNames: readonly string[],
): number[] =>
  perElementPropertyNames.map((propertyName) => {
    if (propertyName === "inline-size") return PER_ELEMENT_LANE_INLINE_SIZE;
    if (propertyName === "block-size") return PER_ELEMENT_LANE_BLOCK_SIZE;
    if (propertyName === "transform-origin") return PER_ELEMENT_LANE_TRANSFORM_ORIGIN;
    if (propertyName === "perspective-origin") return PER_ELEMENT_LANE_PERSPECTIVE_ORIGIN;
    return PER_ELEMENT_LANE_READ;
  });

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
): void => {
  for (let laneIndex = 0; laneIndex < perElementPropertyNames.length; laneIndex++) {
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
      } else if ((targetStyles["perspective"] ?? "none") === "none") {
        continue;
      }
    }
    const propertyName = perElementPropertyNames[laneIndex];
    const propertyValue = computedStyle.getPropertyValue(propertyName);
    targetStyles[propertyName] = propertyValue !== "" ? propertyValue : undefined;
  }
};
