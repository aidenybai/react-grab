import { EXPLICIT_SNAPSHOT_PROPS } from "../constants";
import type { StyleDeclarationMap } from "../types";
import { shouldSkipStyleProp } from "./should-skip-style-prop";

export const snapshotComputedStyle = (computedStyle: CSSStyleDeclaration): StyleDeclarationMap => {
  const styles: StyleDeclarationMap = {};
  for (let propertyIndex = 0; propertyIndex < computedStyle.length; propertyIndex++) {
    const propertyName = computedStyle.item(propertyIndex);
    if (shouldSkipStyleProp(propertyName)) continue;
    styles[propertyName] = computedStyle.getPropertyValue(propertyName);
  }
  for (const propertyName of EXPLICIT_SNAPSHOT_PROPS) {
    if (styles[propertyName] !== undefined) continue;
    const propertyValue = computedStyle.getPropertyValue(propertyName);
    if (propertyValue) styles[propertyName] = propertyValue;
  }
  return styles;
};
