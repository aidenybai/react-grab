import { OPACITY_PERCENT_MAX } from "../constants.js";
import type { DesignTokenResolver, PendingEdit, PendingEditsEntry } from "../types.js";
import { formatDisplayValue } from "./format-css-value.js";

interface CssDeclaration {
  edit: PendingEdit;
  cssValue: string;
}

const formatCssValue = (pendingEdit: PendingEdit): string => {
  if (pendingEdit.kind === "color" || pendingEdit.kind === "enum") return pendingEdit.value;
  if (pendingEdit.key === "opacity" && pendingEdit.unit === "%") {
    return formatDisplayValue(pendingEdit.value / OPACITY_PERCENT_MAX);
  }
  return `${formatDisplayValue(pendingEdit.value)}${pendingEdit.unit}`;
};

const tokenForDeclaration = (
  cssProperty: string,
  declaration: CssDeclaration,
  designTokens: DesignTokenResolver | undefined,
): string | null => {
  if (!designTokens?.hasTokens) return null;
  const { edit } = declaration;
  if (edit.kind === "color") return designTokens.matchColor(edit.value);
  if (edit.kind === "numeric" && edit.unit === "px") {
    return designTokens.matchLength(edit.value, cssProperty);
  }
  return null;
};

const formatEntryCss = (pendingEditsEntry: PendingEditsEntry): string[] => {
  const declarationByCssProperty = new Map<string, CssDeclaration>();
  for (const pendingEdit of pendingEditsEntry.edits) {
    const cssValue = formatCssValue(pendingEdit);
    for (const cssProperty of pendingEdit.cssProperties) {
      declarationByCssProperty.set(cssProperty, { edit: pendingEdit, cssValue });
    }
  }
  return Array.from(declarationByCssProperty, ([cssProperty, declaration]) => {
    const tokenName = tokenForDeclaration(cssProperty, declaration, pendingEditsEntry.designTokens);
    const tokenHint = tokenName ? ` /* var(${tokenName}) */` : "";
    return `${cssProperty}: ${declaration.cssValue};${tokenHint}`;
  });
};

const TOKEN_HINT_MARKER = "/* var(";

const formatEntryHeader = (pendingEditsEntry: PendingEditsEntry): string =>
  pendingEditsEntry.filePath ? `${pendingEditsEntry.filePath}:${pendingEditsEntry.lineNumber}` : "";

const wrapCssBlock = (cssLines: string[]): string => ["```css", ...cssLines, "```"].join("\n");

interface FormattedEntry {
  header: string;
  cssLines: string[];
}

export const formatSessionEditsPrompt = (pendingEditsEntries: PendingEditsEntry[]): string => {
  if (pendingEditsEntries.length === 0) return "";

  const formattedEntries: FormattedEntry[] = pendingEditsEntries.map((pendingEditsEntry) => ({
    header: formatEntryHeader(pendingEditsEntry),
    cssLines: formatEntryCss(pendingEditsEntry),
  }));

  const sections: string[] = [
    "Apply these style changes canonically (CSS = visual intent; choose the source change that best expresses the underlying layout intent):",
  ];

  const hasTokenHint = formattedEntries.some((entry) =>
    entry.cssLines.some((line) => line.includes(TOKEN_HINT_MARKER)),
  );
  if (hasTokenHint) {
    sections.push(
      "Prefer the design token shown in each `/* var(--token) */` comment over the raw value when it matches the project's intent.",
    );
  }

  if (formattedEntries.length === 1) {
    const [onlyEntry] = formattedEntries;
    if (onlyEntry.header) sections.push(`\n${onlyEntry.header}`);
    sections.push(wrapCssBlock(onlyEntry.cssLines));
    return sections.join("\n");
  }

  for (const formattedEntry of formattedEntries) {
    sections.push(formattedEntry.header ? `\n${formattedEntry.header}` : "");
    sections.push(wrapCssBlock(formattedEntry.cssLines));
  }
  return sections.join("\n");
};
