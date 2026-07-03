import { OVERLAY_POSITIONS, ZERO_SCALE_TRANSFORMS } from "../constants";
import type { StyleDeclarationMap } from "../types";

export const isZeroScaleOverlay = (styles: StyleDeclarationMap): boolean =>
  ZERO_SCALE_TRANSFORMS.has(styles["transform"] ?? "") &&
  OVERLAY_POSITIONS.has(styles["position"] ?? "");
