import { getInlineHTMLPreview, getStackContext } from "./context.js";
import { copyContent } from "../utils/copy-content.js";
import { normalizeError } from "../utils/normalize-error.js";
import type { SourceOptions } from "../types.js";

interface CopyFlowOptions {
  getContent?: (elements: Element[]) => Promise<string> | string;
  componentName?: string;
  sourceOptions?: SourceOptions;
}

interface CopyFlowHooks {
  onBeforeCopy: (elements: Element[]) => Promise<void>;
  transformCopyContent: (content: string, elements: Element[]) => Promise<string>;
  onAfterCopy: (elements: Element[], didCopy: boolean) => void;
  onCopySuccess: (elements: Element[], content: string) => void;
  onCopyError: (error: Error) => void;
}

const formatElementReference = async (
  element: Element,
  sourceOptions: SourceOptions | undefined,
): Promise<string> => {
  const inlinePreview = getInlineHTMLPreview(element);
  const inlineStack = (await getStackContext(element, { sourceOptions })).replace(/\n\s+/g, " ");
  return `[${inlinePreview}${inlineStack}]`;
};

const buildClipboardPayload = async (
  elements: Element[],
  sourceOptions: SourceOptions | undefined,
): Promise<string | null> => {
  const references = await Promise.all(
    elements.map((element) => formatElementReference(element, sourceOptions)),
  );
  const uniqueReferences = [...new Set(references)];
  return uniqueReferences.length > 0 ? uniqueReferences.join("\n") : null;
};

export const runCopyFlow = async (
  options: CopyFlowOptions,
  hooks: CopyFlowHooks,
  elements: Element[],
  prependedPrompt?: string,
): Promise<boolean> => {
  await hooks.onBeforeCopy(elements);

  let didCopy = false;
  let finalContent = "";

  try {
    const rawContent = options.getContent
      ? await options.getContent(elements)
      : await buildClipboardPayload(elements, options.sourceOptions);

    if (rawContent?.trim()) {
      const transformedContent = await hooks.transformCopyContent(rawContent, elements);
      finalContent = prependedPrompt
        ? `${prependedPrompt}\n${transformedContent}`
        : transformedContent;
      didCopy = copyContent(finalContent, { componentName: options.componentName });
    }
  } catch (error) {
    hooks.onCopyError(normalizeError(error));
  }

  if (didCopy) hooks.onCopySuccess(elements, finalContent);
  hooks.onAfterCopy(elements, didCopy);

  return didCopy;
};
