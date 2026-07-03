const CSS_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;

export const extractFontFaceBlocks = (cssText: string): string[] => {
  const strippedCss = cssText.replace(CSS_COMMENT_PATTERN, "");
  const blocks: string[] = [];
  let searchIndex = 0;
  while (searchIndex < strippedCss.length) {
    const atRuleIndex = strippedCss.indexOf("@font-face", searchIndex);
    if (atRuleIndex === -1) break;
    const openBraceIndex = strippedCss.indexOf("{", atRuleIndex);
    if (openBraceIndex === -1) break;
    const closeBraceIndex = strippedCss.indexOf("}", openBraceIndex);
    if (closeBraceIndex === -1) break;
    blocks.push(`@font-face{${strippedCss.slice(openBraceIndex + 1, closeBraceIndex)}}`);
    searchIndex = closeBraceIndex + 1;
  }
  return blocks;
};
