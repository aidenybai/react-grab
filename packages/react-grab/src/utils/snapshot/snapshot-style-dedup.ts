interface StyleClassEntry {
  className: string;
  cssProperties: string;
}

export interface StyleDeduplicator {
  getOrCreateClass: (inlineStyleString: string) => string;
  generateCssBlock: () => string;
}

export const createStyleDeduplicator = (): StyleDeduplicator => {
  const styleToClassMap = new Map<string, StyleClassEntry>();
  let classCounter = 0;

  const getOrCreateClass = (inlineStyleString: string): string => {
    if (!inlineStyleString) return "";

    const existing = styleToClassMap.get(inlineStyleString);
    if (existing) return existing.className;

    const className = `_s${classCounter++}`;
    styleToClassMap.set(inlineStyleString, {
      className,
      cssProperties: inlineStyleString,
    });
    return className;
  };

  const generateCssBlock = (): string => {
    if (styleToClassMap.size === 0) return "";

    const invertedMap = new Map<string, string[]>();
    for (const [, { className, cssProperties }] of styleToClassMap) {
      const existing = invertedMap.get(cssProperties);
      if (existing) {
        existing.push(`.${className}`);
      } else {
        invertedMap.set(cssProperties, [`.${className}`]);
      }
    }

    const cssRules: string[] = [];
    for (const [properties, selectors] of invertedMap) {
      cssRules.push(`${selectors.join(",")}{${properties}}`);
    }

    return cssRules.join("\n");
  };

  return { getOrCreateClass, generateCssBlock };
};
