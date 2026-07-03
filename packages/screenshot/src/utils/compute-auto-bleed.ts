import {
  FILTER_BLUR_EXTENT_SIGMA_FACTOR,
  SHADOW_BLUR_EXTENT_FACTOR,
} from "../constants";
import type { StyleDeclarationMap } from "../types";
import { parsePx } from "./parse-px";

const splitTopLevelCommaList = (value: string): string[] => {
  const parts: string[] = [];
  let parenDepth = 0;
  let partStart = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") parenDepth += 1;
    else if (character === ")") parenDepth -= 1;
    else if (character === "," && parenDepth === 0) {
      parts.push(value.slice(partStart, index));
      partStart = index + 1;
    }
  }
  parts.push(value.slice(partStart));
  return parts;
};

const parsePxLengths = (value: string): number[] => {
  const matches = value.match(/-?\d+(?:\.\d+)?px/g);
  return matches ? matches.map((match) => Number.parseFloat(match)) : [];
};

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

const computeFilterBleed = (filterValue: string | undefined): number => {
  if (!filterValue || filterValue === "none") return 0;
  let bleed = 0;
  const functionPattern = /([a-z-]+)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
  let functionMatch = functionPattern.exec(filterValue);
  while (functionMatch) {
    const [, functionName, functionArguments] = functionMatch;
    if (functionName === "blur") {
      bleed = Math.max(bleed, parsePx(functionArguments) * FILTER_BLUR_EXTENT_SIGMA_FACTOR);
    } else if (functionName === "drop-shadow") {
      const [offsetX = 0, offsetY = 0, blur = 0] = parsePxLengths(functionArguments);
      bleed = Math.max(
        bleed,
        Math.max(Math.abs(offsetX), Math.abs(offsetY)) + blur * SHADOW_BLUR_EXTENT_FACTOR,
      );
    }
    functionMatch = functionPattern.exec(filterValue);
  }
  return bleed;
};

export const computeAutoBleed = (rootStyles: StyleDeclarationMap): number =>
  Math.ceil(
    Math.max(
      computeBoxShadowBleed(rootStyles["box-shadow"]),
      computeOutlineBleed(rootStyles),
      computeFilterBleed(rootStyles["filter"]),
    ),
  );
