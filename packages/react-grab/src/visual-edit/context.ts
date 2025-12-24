import { getElementContext as formatElementInfo } from "../context.js";

export const buildDiffContext = async (
  element: Element,
  originalOuterHtml: string,
  userPrompts: string[],
): Promise<string> => {
  const elementInfo = await formatElementInfo(element);
  const isStillInDom = document.contains(element);
  const newOuterHtml = isStillInDom ? element.outerHTML : "(removed)";

  const promptsSection =
    userPrompts.length > 0 ? `Prompts:\n${userPrompts.join("\n")}\n\n` : "";

  const beforeSection = `Before:\n${originalOuterHtml}`;
  const afterSection = `After:\n${newOuterHtml}`;

  return `${promptsSection}${elementInfo}\n\n${beforeSection}\n\n${afterSection}`;
};

