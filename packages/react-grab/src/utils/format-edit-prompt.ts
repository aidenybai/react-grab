import type { PendingEditsEntry } from "./edit-panel-storage.js";

const OPACITY_PERCENT_MAX = 100;

const formatCssNumber = (value: number): string => {
  if (Number.isInteger(value)) return String(value);
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/\.?0+$/, "");
};

const splitCssProperties = (commaSeparatedProperty: string): string[] =>
  commaSeparatedProperty
    .split(",")
    .map((piece) => piece.trim())
    .filter(Boolean);

const formatCssValue = (property: string, value: number, unit: string): string => {
  if (property === "opacity" && unit === "%") {
    return formatCssNumber(value / OPACITY_PERCENT_MAX);
  }
  return `${formatCssNumber(value)}${unit}`;
};

const formatEntryCss = (entry: PendingEditsEntry): string[] => {
  const lines: string[] = [];
  for (const [propertyKey, { value, unit }] of Object.entries(entry.edits)) {
    const cssValue = formatCssValue(propertyKey, value, unit);
    for (const cssProperty of splitCssProperties(propertyKey)) {
      lines.push(`${cssProperty}: ${cssValue};`);
    }
  }
  return lines;
};

const formatLocation = (entry: PendingEditsEntry): string =>
  `${entry.filePath}:${entry.lineNumber}`;

// Composes a single prompt section covering every pending edit collected
// across the session. When there's only one entry, omits the location
// header since the standard payload already references that element.
export const formatSessionEditsPrompt = (entries: PendingEditsEntry[]): string => {
  if (entries.length === 0) return "";

  const sections: string[] = ["Apply these style changes:"];

  if (entries.length === 1) {
    const lines = formatEntryCss(entries[0]);
    sections.push(["```css", ...lines, "```"].join("\n"));
    return sections.join("\n");
  }

  for (const entry of entries) {
    sections.push(`\n${formatLocation(entry)}`);
    sections.push(["```css", ...formatEntryCss(entry), "```"].join("\n"));
  }
  return sections.join("\n");
};
