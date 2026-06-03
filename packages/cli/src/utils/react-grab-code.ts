const stripComments = (content: string): string =>
  content
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");

const stripTypeOnlyReactGrabImports = (content: string): string => {
  const reactGrabSpecifierPattern = String.raw`react-grab(?:\/[^"']+)?`;
  return content
    .replace(
      new RegExp(
        String.raw`import\s+type\s+[^;]+from\s+["']${reactGrabSpecifierPattern}["'];?`,
        "g",
      ),
      "",
    )
    .replace(
      new RegExp(
        String.raw`import\s*\{\s*type\s+[^,}]+(?:,\s*type\s+[^,}]+)*\s*\}\s*from\s+["']${reactGrabSpecifierPattern}["'];?`,
        "g",
      ),
      "",
    );
};

export const hasReactGrabSetupCode = (content: string): boolean => {
  const uncommentedContent = stripTypeOnlyReactGrabImports(stripComments(content));
  const reactGrabSpecifierPattern = String.raw`react-grab(?:\/[^"']+)?`;
  const setupPatterns = [
    new RegExp(String.raw`import\s*\(\s*["']${reactGrabSpecifierPattern}["']\s*\)`),
    new RegExp(
      String.raw`import\s+(?!type\b)(?:[^"';]+from\s+)?["']${reactGrabSpecifierPattern}["']`,
    ),
    new RegExp(String.raw`require\s*\(\s*["']${reactGrabSpecifierPattern}["']\s*\)`),
    /<Script[\s\S]*?src\s*=\s*(?:["'][^"']*react-grab[^"']*["']|\{(?:["'][^"']*react-grab[^"']*["']|`[^`]*react-grab[^`]*`)\})/i,
    /<script[\s\S]*?src\s*=\s*["'][^"']*react-grab[^"']*["']/i,
  ];

  return setupPatterns.some((pattern) => pattern.test(uncommentedContent));
};
