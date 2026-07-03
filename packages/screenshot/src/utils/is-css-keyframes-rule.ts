export const isCssKeyframesRule = (rule: CSSRule): rule is CSSKeyframesRule =>
  rule instanceof CSSKeyframesRule;
