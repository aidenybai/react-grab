export const isCssFontFaceRule = (rule: CSSRule): rule is CSSFontFaceRule =>
  rule.type === CSSRule.FONT_FACE_RULE;
