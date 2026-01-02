import type { Options } from "../types.js";
import { copyContent } from "../utils/copy-content.js";
import { generateSnippet } from "../utils/generate-snippet.js";

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
      const snippets = await generateSnippet(elements, {
        maxLines: options.maxContextLines,
      });
      const combinedSnippets = snippets.join("\n\n");

      if (combinedSnippets.trim()) {
        const plainTextContent = extraPrompt
          ? `${extraPrompt}\n\n${combinedSnippets}`
          : combinedSnippets;

        copiedContent = plainTextContent;
        didCopy = copyContent(plainTextContent, { prompt: extraPrompt });
      }
    }
  } catch (error) {
    const resolvedError =
      error instanceof Error ? error : new Error(String(error));
    options.onCopyError?.(resolvedError);
  }

  if (didCopy) {
    options.onCopySuccess?.(elements, copiedContent);
  }
  options.onAfterCopy?.(elements, didCopy);

  return didCopy;
};
