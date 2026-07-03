// Cross-realm CSS rules are not instances of this window's CSSRule classes,
// so rule kinds are detected by their numeric type.
export const isCssStyleRule = (rule: CSSRule): rule is CSSStyleRule =>
  rule.type === CSSRule.STYLE_RULE;
