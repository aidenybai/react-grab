export const generateBaseResetCss = (rootElement: Element): string => {
  const usedTagNames = new Set<string>();

  if (rootElement.tagName) {
    usedTagNames.add(rootElement.tagName.toLowerCase());
  }

  for (const descendant of Array.from(rootElement.querySelectorAll("*"))) {
    usedTagNames.add(descendant.tagName.toLowerCase());
  }

  if (usedTagNames.size === 0) return "";

  const resetRules: string[] = [
    "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
  ];

  return resetRules.join("\n");
};
