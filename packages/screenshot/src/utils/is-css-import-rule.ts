export const isCssImportRule = (rule: CSSRule): rule is CSSImportRule =>
  rule.type === CSSRule.IMPORT_RULE;
