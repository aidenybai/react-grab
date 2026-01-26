import { copyContent } from "../utils/copy-content.js";
import { generateSnippet } from "../utils/generate-snippet.js";
import { IgnoreComponentsOption } from "../types.js";

interface CopyOptions {
  maxContextLines?: number;
  getContent?: (elements: Element[]) => Promise<string> | string;
  ignoreComponents?: IgnoreComponentsOption;
}

interface CopyHooks {
  onBeforeCopy: (elements: Element[]) => Promise<void>;
  onAfterCopy: (elements: Element[], success: boolean) => void;
  onCopySuccess: (elements: Element[], content: string) => void;
  onCopyError: (error: Error) => void;
}

export const tryCopyWithFallback = async (
  options: CopyOptions,
  hooks: CopyHooks,
  elements: Element[],
  extraPrompt?: string,
): Promise<boolean> => {
  let didCopy = false;
  let copiedContent = "";

  await hooks.onBeforeCopy(elements);

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
        ignoreComponents: options.ignoreComponents,
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
    hooks.onCopyError(resolvedError);
  }

  if (didCopy) {
    hooks.onCopySuccess(elements, copiedContent);
  }
  hooks.onAfterCopy(elements, didCopy);

  return didCopy;
};
