import type { EditableProperty } from "../types.js";

// Default property-list ordering. Keys must match EditableProperty.key
// verbatim — including the comma-joined form for aggregates
// ("padding-top,padding-bottom"). Unlisted keys land last in source
// order.
const RECOMMENDED_KEY_ORDER: readonly string[] = [
  "background-color",
  "color",
  "padding",
  "padding-left,padding-right",
  "padding-top,padding-bottom",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin",
  "margin-left,margin-right",
  "margin-top,margin-bottom",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-transform",
  "text-align",
  "text-decoration-line",
  "white-space",
  "word-break",
  "overflow-wrap",
  "font-variant-numeric",
  "border-radius",
  "border-top-left-radius,border-top-right-radius",
  "border-bottom-left-radius,border-bottom-right-radius",
  "border-top-left-radius,border-bottom-left-radius",
  "border-top-right-radius,border-bottom-right-radius",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "width,height",
  "width",
  "height",
  "max-width",
  "max-height",
  "min-width",
  "min-height",
  "opacity",
  "gap",
  "row-gap",
  "column-gap",
  "border-width",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-color",
  "align-items",
  "justify-content",
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
];

const RECOMMENDATION_RANK = new Map(
  RECOMMENDED_KEY_ORDER.map((key, index) => [key, index] as const),
);

const rankFor = (property: EditableProperty): number =>
  RECOMMENDATION_RANK.get(property.key) ?? Number.POSITIVE_INFINITY;

export const sortPropertiesByRecommendation = (
  properties: EditableProperty[],
): EditableProperty[] =>
  properties
    .map((property, index) => ({ property, index }))
    .sort((left, right) => {
      const delta = rankFor(left.property) - rankFor(right.property);
      return delta !== 0 ? delta : left.index - right.index;
    })
    .map((entry) => entry.property);
