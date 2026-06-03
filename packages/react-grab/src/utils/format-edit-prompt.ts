import { OPACITY_PERCENT_MAX } from "../constants.js";
import type { PendingEdit, PendingEditsEntry } from "../types.js";
import { formatDisplayValue } from "./format-css-value.js";

const formatCssValue = (pendingEdit: PendingEdit): string => {
  if (pendingEdit.kind === "color" || pendingEdit.kind === "enum") return pendingEdit.value;
  if (pendingEdit.key === "opacity" && pendingEdit.unit === "%") {
    return formatDisplayValue(pendingEdit.value / OPACITY_PERCENT_MAX);
  }
  return `${formatDisplayValue(pendingEdit.value)}${pendingEdit.unit}`;
};

const formatEntryCss = (pendingEditsEntry: PendingEditsEntry): string[] => {
  const valueByCssProperty = new Map<string, string>();
  for (const pendingEdit of pendingEditsEntry.edits) {
    const cssValue = formatCssValue(pendingEdit);
    for (const cssProperty of pendingEdit.cssProperties) {
      valueByCssProperty.set(cssProperty, cssValue);
    }
  }
  return Array.from(
    valueByCssProperty,
    ([cssProperty, cssValue]) => `${cssProperty}: ${cssValue};`,
  );
};

const formatEntryHeader = (pendingEditsEntry: PendingEditsEntry): string =>
  pendingEditsEntry.filePath ? `${pendingEditsEntry.filePath}:${pendingEditsEntry.lineNumber}` : "";

export const formatSessionEditsPrompt = (pendingEditsEntries: PendingEditsEntry[]): string => {
  if (pendingEditsEntries.length === 0) return "";

  const sections: string[] = ["Apply these style changes:"];

  if (pendingEditsEntries.length === 1) {
    const header = formatEntryHeader(pendingEditsEntries[0]);
    if (header) sections.push(`\n${header}`);
    sections.push(["```css", ...formatEntryCss(pendingEditsEntries[0]), "```"].join("\n"));
    return sections.join("\n");
  }

  for (const pendingEditsEntry of pendingEditsEntries) {
    const header = formatEntryHeader(pendingEditsEntry);
    sections.push(header ? `\n${header}` : "");
    sections.push(["```css", ...formatEntryCss(pendingEditsEntry), "```"].join("\n"));
  }
  return sections.join("\n");
};
