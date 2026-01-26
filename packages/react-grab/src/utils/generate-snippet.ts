import { getElementContext } from "../core/context.js";
import { IgnoreComponentsOption } from "../types.js";

interface GenerateSnippetOptions {
  maxLines?: number;
  ignoreComponents?: IgnoreComponentsOption;
}

export const generateSnippet = async (
  elements: Element[],
  options: GenerateSnippetOptions = {},
): Promise<string[]> => {
  const elementSnippetResults = await Promise.allSettled(
    elements.map((element) => getElementContext(element, options)),
  );

  const elementSnippets = elementSnippetResults
    .map((result) => (result.status === "fulfilled" ? result.value : ""))
    .filter((snippet) => snippet.trim());

  return elementSnippets;
};
