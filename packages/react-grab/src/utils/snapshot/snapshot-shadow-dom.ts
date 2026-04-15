let shadowScopeCounter = 0;

const extractShadowRootStylesheets = (shadowRoot: ShadowRoot): string => {
  const cssFragments: string[] = [];

  const adoptedSheets = (shadowRoot as unknown as { adoptedStyleSheets?: CSSStyleSheet[] })
    .adoptedStyleSheets;
  if (Array.isArray(adoptedSheets)) {
    for (const sheet of adoptedSheets) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          cssFragments.push(rule.cssText);
        }
      } catch {
        continue;
      }
    }
  }

  for (const sheet of Array.from(shadowRoot.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        cssFragments.push(rule.cssText);
      }
    } catch {
      continue;
    }
  }

  for (const styleElement of Array.from(shadowRoot.querySelectorAll("style"))) {
    cssFragments.push(styleElement.textContent || "");
  }

  return cssFragments.join("\n");
};

const rewriteShadowCssToScopedSelectors = (unscopedCss: string, scopeSelector: string): string => {
  let rewritten = unscopedCss;

  rewritten = rewritten.replace(/:host\(([^)]+)\)/g, `:where(${scopeSelector}:is($1))`);
  rewritten = rewritten.replace(/:host\b/g, `:where(${scopeSelector})`);
  rewritten = rewritten.replace(/::slotted\(([^)]+)\)/g, `:where(${scopeSelector} $1)`);

  rewritten = rewritten.replace(
    /([^{}@]+)\{/g,
    (fullMatch, selectorPart: string) => {
      if (selectorPart.trim().startsWith("@")) return fullMatch;
      if (selectorPart.includes(":where(")) return fullMatch;

      const scopedSelectors = selectorPart
        .split(",")
        .map((selector: string) => selector.trim())
        .filter(Boolean)
        .map((selector: string) => `:where(${scopeSelector} ${selector})`)
        .join(", ");

      return `${scopedSelectors}{`;
    },
  );

  return rewritten;
};

export interface ShadowDomSerializeResult {
  childNodes: Node[];
  scopedCss: string;
}

export const serializeShadowRoot = (
  hostElement: Element,
): ShadowDomSerializeResult | null => {
  const shadowRoot = hostElement.shadowRoot;
  if (!shadowRoot) return null;

  const scopeId = `sd-${shadowScopeCounter++}`;
  const scopeSelector = `[data-sd="${scopeId}"]`;

  hostElement.setAttribute("data-sd", scopeId);

  const unscopedCss = extractShadowRootStylesheets(shadowRoot);
  const scopedCss = rewriteShadowCssToScopedSelectors(unscopedCss, scopeSelector);

  const childNodes: Node[] = [];
  for (const childNode of Array.from(shadowRoot.childNodes)) {
    if (childNode instanceof HTMLStyleElement) continue;
    childNodes.push(childNode);
  }

  return { childNodes, scopedCss };
};

export const resolveSlotContent = (slotElement: HTMLSlotElement): Node[] => {
  const assignedNodes = slotElement.assignedNodes({ flatten: true });
  return assignedNodes.length > 0 ? Array.from(assignedNodes) : Array.from(slotElement.childNodes);
};

export const resetShadowScopeCounter = (): void => {
  shadowScopeCounter = 0;
};
