import { SHADOW_BLUR_EXTENT_FACTOR } from "../constants";
import type { StyleDeclarationMap } from "../types";
import { computeFilterExtent } from "./compute-filter-extent";
import { parsePx } from "./parse-px";
import { parsePxLengths } from "./parse-px-lengths";
import { splitTopLevelCommaList } from "./split-top-level-comma-list";

const computeShadowExtent = (shadowValue: string): number => {
  if (shadowValue.includes("inset")) return 0;
  const [offsetX = 0, offsetY = 0, blur = 0, spread = 0] = parsePxLengths(shadowValue);
  const blurExtent = blur * SHADOW_BLUR_EXTENT_FACTOR;
  return Math.max(
    0,
    blurExtent + spread - offsetX,
    blurExtent + spread + offsetX,
    blurExtent + spread - offsetY,
    blurExtent + spread + offsetY,
  );
};

const computeBoxShadowBleed = (boxShadowValue: string | undefined): number => {
  if (!boxShadowValue || boxShadowValue === "none") return 0;
  let bleed = 0;
  for (const shadowValue of splitTopLevelCommaList(boxShadowValue)) {
    bleed = Math.max(bleed, computeShadowExtent(shadowValue));
  }
  return bleed;
};

const computeOutlineBleed = (styles: StyleDeclarationMap): number => {
  const outlineStyle = styles["outline-style"];
  if (!outlineStyle || outlineStyle === "none") return 0;
  const outlineWidth = parsePx(styles["outline-width"]);
  if (outlineWidth <= 0) return 0;
  return outlineWidth + Math.max(0, parsePx(styles["outline-offset"]));
};

export const computeAutoBleed = (rootStyles: StyleDeclarationMap): number =>
  Math.ceil(
    Math.max(
      computeBoxShadowBleed(rootStyles["box-shadow"]),
      computeOutlineBleed(rootStyles),
      computeFilterExtent(rootStyles["filter"]),
    ),
  );
