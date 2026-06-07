import { OPACITY_PERCENT_MAX } from "../constants.js";
import type { PendingEdit, PendingEditsEntry, PropPendingEdit } from "../types.js";
import { formatDisplayValue } from "./format-css-value.js";

const isPropEdit = (pendingEdit: PendingEdit): pendingEdit is PropPendingEdit =>
  pendingEdit.kind === "prop";

const formatCssValue = (pendingEdit: Exclude<PendingEdit, PropPendingEdit>): string => {
  if (pendingEdit.kind === "color" || pendingEdit.kind === "enum") return pendingEdit.value;
  if (pendingEdit.key === "opacity" && pendingEdit.unit === "%") {
    return formatDisplayValue(pendingEdit.value / OPACITY_PERCENT_MAX);
  }
  return `${formatDisplayValue(pendingEdit.value)}${pendingEdit.unit}`;
};

const formatEntryCss = (cssEdits: Array<Exclude<PendingEdit, PropPendingEdit>>): string[] => {
  const valueByCssProperty = new Map<string, string>();
  for (const pendingEdit of cssEdits) {
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

const formatPropLine = (propEdit: PropPendingEdit): string =>
  `- ${propEdit.label}: ${formatDisplayValue(propEdit.original)} → ${formatDisplayValue(propEdit.value)}`;

const formatEntryHeader = (pendingEditsEntry: PendingEditsEntry): string =>
  pendingEditsEntry.filePath ? `${pendingEditsEntry.filePath}:${pendingEditsEntry.lineNumber}` : "";

const formatEntryBody = (pendingEditsEntry: PendingEditsEntry): string => {
  const cssEdits = pendingEditsEntry.edits.filter(
    (edit): edit is Exclude<PendingEdit, PropPendingEdit> => !isPropEdit(edit),
  );
  const propEdits = pendingEditsEntry.edits.filter(isPropEdit);
  const blocks: string[] = [];
  const cssDeclarations = formatEntryCss(cssEdits);
  if (cssDeclarations.length > 0) {
    blocks.push(["```css", ...cssDeclarations, "```"].join("\n"));
  }
  if (propEdits.length > 0) {
    blocks.push(["Props:", ...propEdits.map(formatPropLine)].join("\n"));
  }
  return blocks.join("\n");
};

const hasPropEdits = (pendingEditsEntries: PendingEditsEntry[]): boolean =>
  pendingEditsEntries.some((entry) => entry.edits.some(isPropEdit));

const introLine = (pendingEditsEntries: PendingEditsEntry[]): string =>
  hasPropEdits(pendingEditsEntries)
    ? "Apply these changes canonically. CSS declarations express visual intent; `Props` are React props on the named component (e.g. motion animate/transition values or component props) — update them at the call site or in the component, whichever best expresses the intent:"
    : "Apply these style changes canonically (CSS = visual intent; choose the source change that best expresses the underlying layout intent):";

export const formatSessionEditsPrompt = (pendingEditsEntries: PendingEditsEntry[]): string => {
  if (pendingEditsEntries.length === 0) return "";

  const sections: string[] = [introLine(pendingEditsEntries)];

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
