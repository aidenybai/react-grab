// Maps top-level CSS aggregate keys to the longhand list they cover.
// Used by the tailwind auto-apply fallback when the canonical aggregate
// row (e.g. "padding") is absent from the panel because the element has
// non-uniform sides — without this expansion we couldn't write through
// to padding-top/right/bottom/left individually.
const AGGREGATE_LONGHANDS: Record<string, ReadonlyArray<string>> = {
  padding: ["padding-top", "padding-right", "padding-bottom", "padding-left"],
  margin: ["margin-top", "margin-right", "margin-bottom", "margin-left"],
  "border-radius": [
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-right-radius",
    "border-bottom-left-radius",
  ],
  gap: ["row-gap", "column-gap"],
};

// Comma-joined keys (e.g. "padding-left,padding-right") split into
// their components; top-level aggregates expand to their CSS sides;
// everything else (single longhand) returns as a single-element array.
export const expandAggregateLonghands = (cssKey: string): string[] => {
  if (cssKey.includes(",")) return cssKey.split(",");
  const expansion = AGGREGATE_LONGHANDS[cssKey];
  return expansion ? [...expansion] : [cssKey];
};
