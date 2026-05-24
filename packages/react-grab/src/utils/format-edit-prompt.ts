import { OPACITY_PERCENT_MAX } from "../constants.js";
import type { PendingEditsEntry } from "./edit-panel-storage.js";
import { formatDisplayValue } from "./format-css-value.js";

const formatCssValue = (cssProperty: string, value: number, unit: string): string => {
  if (cssProperty === "opacity" && unit === "%") {
    return formatDisplayValue(value / OPACITY_PERCENT_MAX);
  }
  return `${formatDisplayValue(value)}${unit}`;
};

const formatEntryCss = (entry: PendingEditsEntry): string[] => {
  const lines: string[] = [];
  for (const edit of entry.edits) {
    const cssValue = formatCssValue(edit.cssProperties[0] ?? edit.key, edit.value, edit.unit);
    for (const cssProperty of edit.cssProperties) {
      lines.push(`${cssProperty}: ${cssValue};`);
    }
  }
  return lines;
};

// Composes a single prompt section covering every pending edit collected
// across the session. With one entry, omits the location header — the
// standard payload already references that element.
export const formatSessionEditsPrompt = (entries: PendingEditsEntry[]): string => {
  if (entries.length === 0) return "";

  const sections: string[] = ["Apply these style changes:"];

  if (entries.length === 1) {
    sections.push(["```css", ...formatEntryCss(entries[0]), "```"].join("\n"));
    return sections.join("\n");
  }

  for (const entry of entries) {
    sections.push(entry.filePath ? `\n${entry.filePath}:${entry.lineNumber}` : "");
    sections.push(["```css", ...formatEntryCss(entry), "```"].join("\n"));
  }
  return sections.join("\n");
};
