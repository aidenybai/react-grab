import { copyContent } from "../utils/copy-content.js";
import { generateSnippet } from "../utils/generate-snippet.js";

interface CopyOptions {
  maxContextLines?: number;
  getContent?: (elements: Element[]) => Promise<string> | string;
  componentName?: string;
}

interface CopyHooks {
  onBeforeCopy: (elements: Element[]) => Promise<void>;
  transformSnippet: (snippet: string, element: Element) => Promise<string>;
  transformCopyContent: (
    content: string,
    elements: Element[],
  ) => Promise<string>;
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
    let generatedContent: string;

    if (options.getContent) {
      generatedContent = await options.getContent(elements);
    } else {
      const rawSnippets = await generateSnippet(elements, {
        maxLines: options.maxContextLines,
      });
      const transformedSnippets = await Promise.all(
        rawSnippets.map((snippet, index) =>
          snippet.trim()
            ? hooks.transformSnippet(snippet, elements[index])
            : Promise.resolve(""),
        ),
      );
      generatedContent = transformedSnippets
        .filter((s) => s.trim())
        .join("\n\n");
    }

    if (generatedContent.trim()) {
      const transformedContent = await hooks.transformCopyContent(
        generatedContent,
        elements,
      );

      copiedContent = extraPrompt
        ? `${extraPrompt}\n\n${transformedContent}`
        : transformedContent;

      didCopy = copyContent(copiedContent, { name: options.componentName });
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
