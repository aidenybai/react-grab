import { getElementContext } from "../context.js";

export const generateSnippet = async (elements: Element[]): Promise<string> => {
  const elementSnippetResults = await Promise.allSettled(
    elements.map((element) => getElementContext(element)),
  );

  const elementSnippets = elementSnippetResults
    .map((result) => (result.status === "fulfilled" ? result.value : ""))
    .filter((snippet) => snippet.trim());

  if (elementSnippets.length === 0) {
    return "";
  }

  return elementSnippets.join("\n\n");
};
