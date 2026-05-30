import { OPACITY_PERCENT_MAX } from "../constants.js";
import type { PendingEdit, PendingEditsEntry } from "../types.js";
import { formatDisplayValue } from "./format-css-value.js";

const formatCssValue = (pendingEdit: PendingEdit): string => {
  if (pendingEdit.kind === "color" || pendingEdit.kind === "enum") return pendingEdit.value;
  // Text edits are filtered out before this runs (formatEntryBody routes
  // them to formatTextLine), so this branch is never hit at runtime. It
  // stays to narrow the union — the numeric tail below reads `.unit`,
  // which TextPendingEdit doesn't have.
  if (pendingEdit.kind === "text") return pendingEdit.value;
  if (pendingEdit.key === "opacity" && pendingEdit.unit === "%") {
    return formatDisplayValue(pendingEdit.value / OPACITY_PERCENT_MAX);
  }
  return `${formatDisplayValue(pendingEdit.value)}${pendingEdit.unit}`;
};

const formatCssBlock = (cssEdits: PendingEdit[]): string => {
  const valueByCssProperty = new Map<string, string>();
  for (const pendingEdit of cssEdits) {
    const cssValue = formatCssValue(pendingEdit);
    for (const cssProperty of pendingEdit.cssProperties) {
      valueByCssProperty.set(cssProperty, cssValue);
    }
  }
  const declarations = Array.from(
    valueByCssProperty,
    ([cssProperty, cssValue]) => `${cssProperty}: ${cssValue};`,
  );
  return ["```css", ...declarations, "```"].join("\n");
};

const formatTextLine = (pendingEdit: PendingEdit): string =>
  `Set the text content to ${JSON.stringify(pendingEdit.value)}.`;

const formatEntryBody = (pendingEditsEntry: PendingEditsEntry): string => {
  const cssEdits = pendingEditsEntry.edits.filter((edit) => edit.kind !== "text");
  const textEdits = pendingEditsEntry.edits.filter((edit) => edit.kind === "text");
  const blocks: string[] = [];
  if (cssEdits.length > 0) blocks.push(formatCssBlock(cssEdits));
  for (const textEdit of textEdits) blocks.push(formatTextLine(textEdit));
  return blocks.join("\n");
};

const formatEntryHeader = (pendingEditsEntry: PendingEditsEntry): string =>
  pendingEditsEntry.filePath ? `${pendingEditsEntry.filePath}:${pendingEditsEntry.lineNumber}` : "";

export const formatSessionEditsPrompt = (pendingEditsEntries: PendingEditsEntry[]): string => {
  if (pendingEditsEntries.length === 0) return "";

  const sections: string[] = ["Apply these changes:"];

  if (pendingEditsEntries.length === 1) {
    const header = formatEntryHeader(pendingEditsEntries[0]);
    if (header) sections.push(`\n${header}`);
    sections.push(formatEntryBody(pendingEditsEntries[0]));
    return sections.join("\n");
  }

  for (const pendingEditsEntry of pendingEditsEntries) {
    const header = formatEntryHeader(pendingEditsEntry);
    sections.push(header ? `\n${header}` : "");
    sections.push(formatEntryBody(pendingEditsEntry));
  }
  return sections.join("\n");
};
