import { OPACITY_PERCENT_MAX } from "../constants.js";
import type { PendingEdit, PendingEditsEntry } from "../types.js";
import { formatDisplayValue } from "./format-css-value.js";

const formatCssValue = (edit: PendingEdit): string => {
  if (edit.kind === "color" || edit.kind === "enum") return edit.value;
  if ((edit.cssProperties[0] ?? edit.key) === "opacity" && edit.unit === "%") {
    return formatDisplayValue(edit.value / OPACITY_PERCENT_MAX);
  }
  return `${formatDisplayValue(edit.value)}${edit.unit}`;
};

const formatEntryCss = (entry: PendingEditsEntry): string[] => {
  // Last-write-wins per CSS property: an aggregate edit (padding) writes
  // to all 4 sides, and a subsequent longhand edit (padding-top) should
  // override JUST that side without leaving the older sibling rules
  // duplicated. Iteration order = order of user edits.
  const valueByCssProperty = new Map<string, string>();
  for (const edit of entry.edits) {
    const cssValue = formatCssValue(edit);
    for (const cssProperty of edit.cssProperties) {
      valueByCssProperty.set(cssProperty, cssValue);
    }
  }
  return Array.from(
    valueByCssProperty,
    ([cssProperty, cssValue]) => `${cssProperty}: ${cssValue};`,
  );
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
