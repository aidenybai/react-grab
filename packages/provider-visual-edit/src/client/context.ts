import { formatElementInfo } from "react-grab/core";

export const generateHtmlDiff = (
  originalHtml: string,
  newHtml: string,
): string => {
  const originalLines = originalHtml.split("\n");
  const newLines = newHtml.split("\n");

  const diffLines: string[] = [];
  const maxLength = Math.max(originalLines.length, newLines.length);

  for (let lineIndex = 0; lineIndex < maxLength; lineIndex++) {
    const originalLine = originalLines[lineIndex];
    const newLine = newLines[lineIndex];

    if (originalLine !== newLine) {
      if (originalLine !== undefined) {
        diffLines.push(`- ${originalLine}`);
      }
      if (newLine !== undefined) {
        diffLines.push(`+ ${newLine}`);
      }
    }
  }

  return diffLines.join("\n");
};

export const buildDiffContext = async (
  element: Element,
  originalOuterHtml: string,
  userPrompts: string[],
): Promise<string> => {
  const elementInfo = await formatElementInfo(element);
  const newOuterHtml = element.outerHTML;
  const htmlDiff = generateHtmlDiff(originalOuterHtml, newOuterHtml);

  const promptsSection =
    userPrompts.length > 0 ? `Prompts:\n${userPrompts.join("\n")}\n\n` : "";

  return `${promptsSection}${elementInfo}\n\n${htmlDiff}`;
};
