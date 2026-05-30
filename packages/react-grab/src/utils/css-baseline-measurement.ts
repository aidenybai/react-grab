import { OPACITY_PERCENT_MAX } from "../constants.js";
import type { EditableProperty } from "../types.js";
import { type ComputedSnapshot, snapshotAllKeys } from "./css-snapshot.js";
import { POSITION_KEYS } from "./property-definitions.js";

// Measure the baseline by inserting a styling-free clone of the same
// tag as a sibling of the target, snapshotting computed style, then
// removing it. Same-parent placement makes inherited properties
// (font-size, color) compare apples-to-apples; display:none keeps
// the clone out of layout so it can't shift the page or trigger any
// of the target's side-effects. Returns null on any failure (detached
// element, exotic namespace, etc.) so callers fall back to the
// hardcoded heuristic below.
export const measureBaseline = (target: Element): ComputedSnapshot | null => {
  try {
    const parent = target.parentElement;
    if (!parent) return null;
    const namespaceUri = target.namespaceURI;
    const tagName = target.tagName.toLowerCase();
    const baseline =
      namespaceUri && namespaceUri !== "http://www.w3.org/1999/xhtml"
        ? target.ownerDocument.createElementNS(namespaceUri, tagName)
        : target.ownerDocument.createElement(tagName);
    const baselineStyle = "style" in baseline ? baseline.style : null;
    if (baselineStyle instanceof CSSStyleDeclaration) {
      baselineStyle.setProperty("display", "none", "important");
    }
    parent.appendChild(baseline);
    try {
      return snapshotAllKeys(getComputedStyle(baseline));
    } finally {
      baseline.remove();
    }
  } catch {
    return null;
  }
};

export const isDefaultByBaseline = (
  property: EditableProperty,
  currentSnapshot: ComputedSnapshot,
  baselineSnapshot: ComputedSnapshot,
): boolean => {
  if (property.kind === "color" || property.kind === "text") return false;
  return property.cssProperties.every((key) => {
    const currentValue = currentSnapshot[key];
    const baselineValue = baselineSnapshot[key];
    if (currentValue === undefined || baselineValue === undefined) return false;
    return currentValue === baselineValue;
  });
};

// Legacy heuristic used only when measureBaseline returns null (target
// has no parent, is in an exotic shadow tree, etc.). Kept as a safety
// net so the panel still produces a sensible list even without a
// baseline.
export const isDefaultByHeuristic = (property: EditableProperty): boolean => {
  if (property.kind === "color" || property.kind === "text") return false;
  if (property.kind === "enum") {
    if (property.key === "font-weight") return property.original === "400";
    return property.options[0]?.value === property.original;
  }
  const { key: propertyKey, original: value } = property;
  if (propertyKey.startsWith("padding") || propertyKey.startsWith("margin")) return value === 0;
  if (propertyKey.includes("gap")) return value === 0;
  if (propertyKey === "border-width") return value === 0;
  if (propertyKey.endsWith("-radius") || propertyKey === "border-radius") return value === 0;
  if (propertyKey === "opacity") return value === OPACITY_PERCENT_MAX;
  if (propertyKey === "letter-spacing") return value === 0;
  if (propertyKey === "z-index") return value === 0;
  if (POSITION_KEYS.has(propertyKey)) return false;
  if (
    propertyKey === "width" ||
    propertyKey === "height" ||
    propertyKey.startsWith("max-") ||
    propertyKey.startsWith("min-")
  ) {
    return true;
  }
  if (propertyKey === "line-height") return true;
  return false;
};
