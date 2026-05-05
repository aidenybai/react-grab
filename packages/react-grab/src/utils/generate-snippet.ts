import {
  formatElementContextParts,
  getElementContextParts,
  type ElementContextParts,
} from "../core/context.js";
import { logRecoverableError } from "./log-recoverable-error.js";

interface GenerateSnippetOptions {
  maxLines?: number;
}

const buildEmptyParts = (): ElementContextParts => ({
  htmlPreview: "",
  sourceSnippet: null,
  stackLines: [],
});

export const generateSnippetParts = async (
  elements: Element[],
  options: GenerateSnippetOptions = {},
): Promise<ElementContextParts[]> => {
  const results = await Promise.allSettled(
    elements.map((element) => getElementContextParts(element, options)),
  );
  return results.map((result) => {
    if (result.status === "fulfilled") return result.value;
    logRecoverableError("generateSnippetParts: failed to build element context", result.reason);
    return buildEmptyParts();
  });
};

export const generateSnippet = async (
  elements: Element[],
  options: GenerateSnippetOptions = {},
): Promise<string[]> => {
  const partsList = await generateSnippetParts(elements, options);
  return partsList.map(formatElementContextParts);
};
