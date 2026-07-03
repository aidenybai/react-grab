import {
  BORDER_WIDTH_STYLE_PROPS,
  CONCRETE_VALUE_STYLE_PROPS,
  CURRENTCOLOR_DEFAULT_STYLE_PROPS,
  MARKER_STYLE_PROPS,
  MIN_WIDTH_FLOOR_TABLE_TAGS,
  SIZE_STYLE_PROPS,
  TABLE_BOX_TAGS,
} from "../constants";
import type { CaptureOutputGeometry, DiffStylesInput, StyleDeclarationMap } from "../types";
import { isInheritedStyleProp } from "../utils/is-inherited-style-prop";

const CURRENTCOLOR_BORDER_STYLE_PROPS = new Set(
  CURRENTCOLOR_DEFAULT_STYLE_PROPS.filter((propertyName) => propertyName.includes("border")),
);

export const diffStyles = ({
  styles,
  baseline,
  parentStyles,
  parentEmittedStyles,
}: DiffStylesInput): StyleDeclarationMap => {
  const diffed: StyleDeclarationMap = {};
  const hasNativeAppearance = styles["appearance"] === "auto";
  for (const propertyName in styles) {
    const propertyValue = styles[propertyName];
    if (propertyValue === undefined) continue;
    if (propertyValue !== baseline[propertyName]) {
      diffed[propertyName] = propertyValue;
      continue;
    }
    const isForcedConcreteValue =
      CONCRETE_VALUE_STYLE_PROPS.has(propertyName) &&
      !(hasNativeAppearance && BORDER_WIDTH_STYLE_PROPS.has(propertyName));
    if (isForcedConcreteValue) diffed[propertyName] = propertyValue;
  }
  const ownColor = styles["color"];
  for (const currentColorProp of CURRENTCOLOR_DEFAULT_STYLE_PROPS) {
    const propertyValue = styles[currentColorProp];
    if (propertyValue === undefined) continue;
    const isNativeAppearanceBorderColor =
      hasNativeAppearance &&
      CURRENTCOLOR_BORDER_STYLE_PROPS.has(currentColorProp) &&
      propertyValue === baseline[currentColorProp];
    if (propertyValue === ownColor || isNativeAppearanceBorderColor) {
      delete diffed[currentColorProp];
    } else {
      diffed[currentColorProp] = propertyValue;
    }
  }
  if (parentEmittedStyles && parentStyles) {
    for (const propertyName in parentEmittedStyles) {
      if (propertyName in diffed) continue;
      if (!isInheritedStyleProp(propertyName)) continue;
      const ownValue = styles[propertyName];
      if (ownValue !== undefined && ownValue !== parentStyles[propertyName]) {
        diffed[propertyName] = ownValue;
      }
    }
  }
  return diffed;
};

const isMarkerStyleProp = (propertyName: string): boolean =>
  propertyName.startsWith("font") || MARKER_STYLE_PROPS.has(propertyName);

export const diffMarkerStyles = (
  markerStyles: StyleDeclarationMap | null,
  elementStyles: StyleDeclarationMap,
): StyleDeclarationMap | null => {
  if (!markerStyles) return null;
  let diffed: StyleDeclarationMap | null = null;
  for (const propertyName in markerStyles) {
    if (!isMarkerStyleProp(propertyName)) continue;
    const propertyValue = markerStyles[propertyName];
    if (propertyValue === undefined) continue;
    const inheritedValue = propertyName === "content" ? "normal" : elementStyles[propertyName];
    if (propertyValue === inheritedValue) continue;
    diffed ??= {};
    diffed[propertyName] = propertyValue;
  }
  return diffed;
};

export const applySizeFreezingPolicy = (
  diffed: StyleDeclarationMap,
  styles: StyleDeclarationMap,
  parentDisplay: string | null,
  isReplaced: boolean,
  tagName: string | null,
): void => {
  if (!isReplaced && styles["display"] === "inline") {
    for (const sizeProp of SIZE_STYLE_PROPS) delete diffed[sizeProp];
  }
  if (tagName !== null && TABLE_BOX_TAGS.has(tagName)) {
    const capturedWidth = diffed["width"] ?? styles["width"];
    for (const sizeProp of SIZE_STYLE_PROPS) delete diffed[sizeProp];
    const authoredMinWidth = styles["min-width"];
    const hasAuthoredMinWidth =
      authoredMinWidth !== undefined && authoredMinWidth !== "auto" && authoredMinWidth !== "0px";
    if (MIN_WIDTH_FLOOR_TABLE_TAGS.has(tagName) && capturedWidth && !hasAuthoredMinWidth) {
      diffed["min-width"] = capturedWidth;
    }
  }
  const isFlexItem = parentDisplay !== null && parentDisplay.includes("flex");
  const isGridItem = parentDisplay !== null && parentDisplay.includes("grid");
  if (isFlexItem) {
    diffed["flex-grow"] = "0";
    diffed["flex-shrink"] = "0";
    diffed["flex-basis"] = "auto";
  }
  if ((isFlexItem || isGridItem) && styles["min-width"] === "auto") diffed["min-width"] = "0px";
};

export const applyRootStyleOverrides = (
  diffed: StyleDeclarationMap,
  outputGeometry: CaptureOutputGeometry,
): void => {
  diffed["margin-top"] = "0px";
  diffed["margin-right"] = "0px";
  diffed["margin-bottom"] = "0px";
  diffed["margin-left"] = "0px";
  diffed["right"] = "auto";
  diffed["bottom"] = "auto";
  const hasContentOffset =
    outputGeometry.contentOffsetLeftPx !== 0 || outputGeometry.contentOffsetTopPx !== 0;
  if (hasContentOffset) {
    diffed["position"] = "relative";
    diffed["left"] = `${outputGeometry.contentOffsetLeftPx}px`;
    diffed["top"] = `${outputGeometry.contentOffsetTopPx}px`;
  } else {
    diffed["top"] = "auto";
    diffed["left"] = "auto";
    const positionValue = diffed["position"];
    if (positionValue === "fixed" || positionValue === "absolute" || positionValue === "sticky") {
      diffed["position"] = "relative";
    }
  }
  const rootLinearTransform = outputGeometry.rootLinearTransform;
  if (rootLinearTransform) {
    const { a, b, c, d } = rootLinearTransform;
    diffed["transform"] = `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`;
    diffed["transform-origin"] = "0px 0px";
  } else if (diffed["transform"]) {
    diffed["transform"] = "none";
  }
  if (diffed["rotate"]) diffed["rotate"] = "none";
  if (diffed["scale"]) diffed["scale"] = "none";
  if (diffed["translate"]) diffed["translate"] = "none";
  if (diffed["float"]) diffed["float"] = "none";
  if (diffed["clear"]) diffed["clear"] = "none";
  diffed["box-sizing"] = "border-box";
  diffed["width"] = `${outputGeometry.layoutWidthPx}px`;
  diffed["height"] = `${outputGeometry.layoutHeightPx}px`;
  delete diffed["inline-size"];
  delete diffed["block-size"];
};
