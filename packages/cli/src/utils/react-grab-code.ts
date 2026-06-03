const stripComments = (content: string): string =>
  content
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");

export const hasReactGrabSetupCode = (content: string): boolean => {
  const uncommentedContent = stripComments(content);
  const reactGrabSpecifierPattern = String.raw`react-grab(?:\/[^"']+)?`;
  const setupPatterns = [
    new RegExp(String.raw`import\s*\(\s*["']${reactGrabSpecifierPattern}["']\s*\)`),
    new RegExp(
      String.raw`import\s+(?!type\b)(?:[^"';]+from\s+)?["']${reactGrabSpecifierPattern}["']`,
    ),
    new RegExp(String.raw`require\s*\(\s*["']${reactGrabSpecifierPattern}["']\s*\)`),
    /<Script[\s\S]*?src\s*=\s*(?:["'][^"']*react-grab[^"']*["']|\{["'][^"']*react-grab[^"']*["']\})/i,
    /<script[\s\S]*?src\s*=\s*["'][^"']*react-grab[^"']*["']/i,
  ];

  return setupPatterns.some((pattern) => pattern.test(uncommentedContent));
};
