const stripComments = (content: string): string =>
  content
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");

export const hasReactGrabSetupCode = (content: string): boolean => {
  const uncommentedContent = stripComments(content);
  const setupPatterns = [
    /import\s*\(\s*["']react-grab(?:\/core)?["']\s*\)/,
    /import\s+(?:[^"';]+from\s+)?["']react-grab(?:\/core)?["']/,
    /require\s*\(\s*["']react-grab(?:\/core)?["']\s*\)/,
    /<Script[\s\S]*?src\s*=\s*(?:["'][^"']*react-grab[^"']*["']|\{["'][^"']*react-grab[^"']*["']\})/i,
    /<script[\s\S]*?src\s*=\s*["'][^"']*react-grab[^"']*["']/i,
  ];

  return setupPatterns.some((pattern) => pattern.test(uncommentedContent));
};
