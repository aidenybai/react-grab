import { formatElementInfo } from "../instrumentation.js";

export const generateSnippet = async (elements: Element[]): Promise<string> => {
  const elementSnippetResults = await Promise.allSettled(
    elements.map((element) => formatElementInfo(element)),
  );

  const elementSnippets = elementSnippetResults
    .map((result) => (result.status === "fulfilled" ? result.value : ""))
    .filter((snippet) => snippet.trim());

  if (elementSnippets.length === 0) {
    return "";
  }

  return elementSnippets.join("\n\n");
};
