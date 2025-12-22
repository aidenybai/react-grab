import type { Options } from "../types.js";
import { copyContent } from "../utils/copy-content.js";
import { generateSnippet } from "../utils/generate-snippet.js";

const hasInnerText = (
  element: Element,
): element is Element & { innerText: string } => "innerText" in element;

const extractElementTextContent = (element: Element): string => {
  if (hasInnerText(element)) {
    return element.innerText;
  }

  return element.textContent ?? "";
};

const createCombinedTextContent = (elements: Element[]): string =>
  elements
    .map((element) => extractElementTextContent(element).trim())
    .filter((textContent) => textContent.length > 0)
    .join("\n\n");

export const tryCopyWithFallback = async (
  options: Options,
  elements: Element[],
  extraPrompt?: string,
): Promise<boolean> => {
  let didCopy = false;
  let copiedContent = "";

  await options.onBeforeCopy?.(elements);

  try {
    if (options.getContent) {
      const customContent = await options.getContent(elements);
      if (customContent.trim()) {
        const contentWithPrompt = extraPrompt
          ? `${extraPrompt}\n\n${customContent}`
          : customContent;
        copiedContent = contentWithPrompt;
        didCopy = copyContent(contentWithPrompt, { prompt: extraPrompt });
      }
    } else {
      const combinedSnippets = await generateSnippet(elements, {
        maxLines: options.maxContextLines,
      });

      if (combinedSnippets.trim()) {
        const plainTextContent = extraPrompt
          ? `${extraPrompt}\n\n${combinedSnippets}`
          : combinedSnippets;

        copiedContent = plainTextContent;
        didCopy = copyContent(plainTextContent, { prompt: extraPrompt });
      }

      if (!didCopy) {
        const plainTextContentOnly = createCombinedTextContent(elements);
        if (plainTextContentOnly.length > 0) {
          const contentWithPrompt = extraPrompt
            ? `${extraPrompt}\n\n${plainTextContentOnly}`
            : plainTextContentOnly;

          copiedContent = contentWithPrompt;
          didCopy = copyContent(contentWithPrompt, { prompt: extraPrompt });
        }
      }
    }
  } catch (error) {
    const resolvedError =
      error instanceof Error ? error : new Error(String(error));
    options.onCopyError?.(resolvedError);

    const plainTextContentOnly = createCombinedTextContent(elements);
    if (plainTextContentOnly.length > 0) {
      const contentWithPrompt = extraPrompt
        ? `${extraPrompt}\n\n${plainTextContentOnly}`
        : plainTextContentOnly;

      copiedContent = contentWithPrompt;
      didCopy = copyContent(contentWithPrompt, { prompt: extraPrompt });
    }
  }

  if (didCopy) {
    options.onCopySuccess?.(elements, copiedContent);
  }
  options.onAfterCopy?.(elements, didCopy);

  return didCopy;
};

