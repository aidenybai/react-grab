export const isCssGroupingRule = (rule: CSSRule): rule is CSSGroupingRule => "cssRules" in rule;
