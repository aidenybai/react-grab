import { formatElementInfo } from "../core/context.js";
import type { SourceOptions } from "../types.js";

interface GenerateSnippetOptions {
  maxLines?: number;
  sourceOptions?: SourceOptions;
}

export const generateSnippet = async (
  elements: Element[],
  options: GenerateSnippetOptions = {},
): Promise<string[]> => {
  const elementSnippetResults = await Promise.allSettled(
    elements.map((element) => formatElementInfo(element, options)),
  );

  const elementSnippets = elementSnippetResults.map((result) =>
    result.status === "fulfilled" ? result.value : "",
  );

  return elementSnippets;
};
