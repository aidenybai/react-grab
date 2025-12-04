import { getElementContext } from "../context.js";

interface GenerateSnippetOptions {
  maxLines?: number;
}

export const generateSnippet = async (
  elements: Element[],
  options: GenerateSnippetOptions = {},
): Promise<string> => {
  const elementSnippetResults = await Promise.allSettled(
    elements.map((element) => getElementContext(element, options)),
  );

  const elementSnippets = elementSnippetResults
    .map((result) => (result.status === "fulfilled" ? result.value : ""))
    .filter((snippet) => snippet.trim());

  if (elementSnippets.length === 0) {
    return "";
  }

  return elementSnippets.join("\n\n");
};
