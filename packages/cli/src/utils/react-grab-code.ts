const REACT_GRAB_SPECIFIER_PATTERN = String.raw`react-grab(?:\/[^"']+)?`;

const stripComments = (content: string): string =>
  content
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");

const stripTypeOnlyReactGrabImports = (content: string): string => {
  return content
    .replace(
      new RegExp(
        String.raw`import\s+type\s+[^;]+from\s+["']${REACT_GRAB_SPECIFIER_PATTERN}["'];?`,
        "g",
      ),
      "",
    )
    .replace(
      new RegExp(
        String.raw`import\s*\{\s*type\s+[^,}]+(?:\s*,\s*type\s+[^,}]+)*\s*,?\s*\}\s*from\s+["']${REACT_GRAB_SPECIFIER_PATTERN}["'];?`,
        "g",
      ),
      "",
    );
};

export const hasReactGrabSetupCode = (content: string): boolean => {
  const setupCandidateContent = stripTypeOnlyReactGrabImports(stripComments(content));
  const setupPatterns = [
    new RegExp(String.raw`import\s*\(\s*["']${REACT_GRAB_SPECIFIER_PATTERN}["']\s*\)`),
    new RegExp(
      String.raw`import\s+(?!type\b)(?:[^"';]+from\s+)?["']${REACT_GRAB_SPECIFIER_PATTERN}["']`,
    ),
    new RegExp(String.raw`require\s*\(\s*["']${REACT_GRAB_SPECIFIER_PATTERN}["']\s*\)`),
    /<Script[\s\S]*?src\s*=\s*(?:["'][^"']*react-grab[^"']*["']|\{(?:["'][^"']*react-grab[^"']*["']|`[^`]*react-grab[^`]*`)\})/i,
    /<script[\s\S]*?src\s*=\s*["'][^"']*react-grab[^"']*["']/i,
  ];

  return setupPatterns.some((pattern) => pattern.test(setupCandidateContent));
};
