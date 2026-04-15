const SCROLLBAR_PSEUDO_PATTERN = /::-webkit-scrollbar(-[a-z-]+)?\b/i;

const collectScrollbarRulesFromRuleList = (
  rules: CSSRuleList,
  deduplicatedRules: Set<string>,
): string => {
  let collectedCss = "";

  for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
    const rule = rules[ruleIndex];
    try {
      if (rule instanceof CSSImportRule && rule.styleSheet) {
        collectedCss += collectScrollbarRulesFromRuleList(rule.styleSheet.cssRules, deduplicatedRules);
        continue;
      }

      if (rule instanceof CSSMediaRule && rule.cssRules) {
        const innerScrollbarCss = collectScrollbarRulesFromRuleList(rule.cssRules, deduplicatedRules);
        if (innerScrollbarCss) {
          collectedCss += `@media ${rule.conditionText}{${innerScrollbarCss}}`;
        }
        continue;
      }

      if (rule instanceof CSSSupportsRule && rule.cssRules) {
        const innerScrollbarCss = collectScrollbarRulesFromRuleList(rule.cssRules, deduplicatedRules);
        if (innerScrollbarCss) {
          collectedCss += `@supports ${rule.conditionText}{${innerScrollbarCss}}`;
        }
        continue;
      }

      if (rule instanceof CSSStyleRule) {
        const selectorText = rule.selectorText || "";
        if (SCROLLBAR_PSEUDO_PATTERN.test(selectorText)) {
          const ruleText = rule.cssText;
          if (ruleText && !deduplicatedRules.has(ruleText)) {
            deduplicatedRules.add(ruleText);
            collectedCss += ruleText;
          }
        }
      }
    } catch {
      continue;
    }
  }

  return collectedCss;
};

export const collectScrollbarCss = (targetDocument: Document): string => {
  if (!targetDocument?.styleSheets) return "";

  const deduplicatedRules = new Set<string>();
  let scrollbarCss = "";

  for (const sheet of Array.from(targetDocument.styleSheets)) {
    try {
      scrollbarCss += collectScrollbarRulesFromRuleList(sheet.cssRules, deduplicatedRules);
    } catch {
      continue;
    }
  }

  return scrollbarCss;
};
