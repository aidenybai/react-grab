import { OPACITY_PERCENT_MAX } from "../constants.js";
import type { PendingEdit, PendingEditsEntry } from "../types.js";
import { formatDisplayValue } from "./format-css-value.js";

const formatCssValue = (edit: PendingEdit): string => {
  if (edit.kind === "color" || edit.kind === "enum") return String(edit.value);
  const value = edit.value as number;
  if ((edit.cssProperties[0] ?? edit.key) === "opacity" && edit.unit === "%") {
    return formatDisplayValue(value / OPACITY_PERCENT_MAX);
  }
  return `${formatDisplayValue(value)}${edit.unit}`;
};

const formatEntryCss = (entry: PendingEditsEntry): string[] => {
  const lines: string[] = [];
  for (const edit of entry.edits) {
    const cssValue = formatCssValue(edit);
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
