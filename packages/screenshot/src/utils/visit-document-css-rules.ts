import { isCssGroupingRule } from "./is-css-grouping-rule";
import { isCssImportRule } from "./is-css-import-rule";
import { resolveUrl } from "./resolve-url";

export const visitDocumentCssRules = (
  sourceDocument: Document,
  visitRule: (rule: CSSRule, baseUrl: string | null) => boolean,
  onInaccessibleSheet: (sheetUrl: string | null) => boolean,
): void => {
  const visitRuleList = (rules: CSSRuleList, baseUrl: string | null): boolean => {
    for (const rule of rules) {
      if (visitRule(rule, baseUrl)) return true;
      if (isCssImportRule(rule)) {
        try {
          const importedSheet = rule.styleSheet;
          if (
            importedSheet &&
            visitRuleList(importedSheet.cssRules, importedSheet.href ?? baseUrl)
          ) {
            return true;
          }
        } catch {
          if (onInaccessibleSheet(resolveUrl(rule.href, baseUrl))) return true;
        }
      } else if (isCssGroupingRule(rule)) {
        if (visitRuleList(rule.cssRules, baseUrl)) return true;
      }
    }
    return false;
  };
  for (const sheet of [...sourceDocument.styleSheets, ...sourceDocument.adoptedStyleSheets]) {
    try {
      if (visitRuleList(sheet.cssRules, sheet.href ?? sourceDocument.baseURI)) return;
    } catch {
      if (onInaccessibleSheet(sheet.href ?? null)) return;
    }
  }
};
