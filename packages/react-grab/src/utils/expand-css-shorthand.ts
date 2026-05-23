const SHORTHAND_LONGHAND: Record<string, string[]> = {
  padding: ["padding-top", "padding-right", "padding-bottom", "padding-left"],
  margin: ["margin-top", "margin-right", "margin-bottom", "margin-left"],
  "border-radius": [
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-right-radius",
    "border-bottom-left-radius",
  ],
  gap: ["row-gap", "column-gap"],
  "border-width": [
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width",
  ],
  "border-color": [
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
  ],
};

const expandSingle = (cssProperty: string): string[] =>
  SHORTHAND_LONGHAND[cssProperty] ?? [cssProperty];

export const expandCssLonghands = (commaSeparatedProperty: string): string[] => {
  const expanded = new Set<string>();
  for (const piece of commaSeparatedProperty.split(",")) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    for (const longhand of expandSingle(trimmed)) {
      expanded.add(longhand);
    }
  }
  return Array.from(expanded);
};
