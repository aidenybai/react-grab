import { getInlineHTMLPreview, getStackContext } from "./context.js";
import { copyContent } from "../utils/copy-content.js";
import { normalizeError } from "../utils/normalize-error.js";

interface CopyOptions {
  getContent?: (elements: Element[]) => Promise<string> | string;
  componentName?: string;
}

interface CopyHooks {
  onBeforeCopy: (elements: Element[]) => Promise<void>;
  transformCopyContent: (content: string, elements: Element[]) => Promise<string>;
  onAfterCopy: (elements: Element[], success: boolean) => void;
  onCopySuccess: (elements: Element[], content: string) => void;
  onCopyError: (error: Error) => void;
}

const flattenStackContext = (stackContext: string): string => stackContext.replace(/\n\s+/g, " ");

const formatDetailedReferenceLine = async (element: Element): Promise<string> => {
  const inlinePreview = getInlineHTMLPreview(element);
  const stackContext = await getStackContext(element);
  if (!stackContext) {
    return `[${inlinePreview}]`;
  }
  return `[${inlinePreview}${flattenStackContext(stackContext)}]`;
};

const buildDetailedContent = async (elements: Element[]): Promise<string | null> => {
  const referenceLines = await Promise.all(elements.map(formatDetailedReferenceLine));
  const uniqueReferenceLines = [...new Set(referenceLines.filter((line) => line.length > 0))];
  return uniqueReferenceLines.length > 0 ? uniqueReferenceLines.join("\n") : null;
};

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
    const generatedContent = options.getContent
      ? await options.getContent(elements)
      : await buildDetailedContent(elements);

    if (generatedContent?.trim()) {
      const transformedContent = await hooks.transformCopyContent(generatedContent, elements);

      copiedContent = extraPrompt ? `${extraPrompt}\n${transformedContent}` : transformedContent;

      didCopy = copyContent(copiedContent, {
        componentName: options.componentName,
      });
    }
  } catch (error) {
    hooks.onCopyError(normalizeError(error));
  }

  if (didCopy) {
    hooks.onCopySuccess(elements, copiedContent);
  }
  hooks.onAfterCopy(elements, didCopy);

  return didCopy;
};
