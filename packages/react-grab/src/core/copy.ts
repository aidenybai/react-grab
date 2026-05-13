import {
  resolveSource,
  checkIsNextProject,
  getComponentDisplayName,
  getDirectTextContent,
  getInlineHTMLPreview,
} from "./context.js";
import { COMPACT_IDENTIFYING_ATTRS, COMPACT_TEXT_MAX_LENGTH } from "../constants.js";
import { copyContent } from "../utils/copy-content.js";
import { getTagName } from "../utils/get-tag-name.js";
import { normalizeError } from "../utils/normalize-error.js";
import { truncateString } from "../utils/truncate-string.js";

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

const buildCompactContent = async (elements: Element[]): Promise<string | null> => {
  const isNextProject = checkIsNextProject();
  const uniqueReferences = new Set<string>();

  for (const element of elements) {
    const tagName = getTagName(element);
    const source = await resolveSource(element);
    const componentName = source?.componentName ?? getComponentDisplayName(element);

    if (source || componentName) {
      let identifyingAttrs = "";
      for (const attrName of COMPACT_IDENTIFYING_ATTRS) {
        const attrValue = element.getAttribute(attrName);
        if (attrValue) {
          identifyingAttrs += ` ${attrName}="${attrValue}"`;
        }
      }
      const directText = getDirectTextContent(element);
      const textSnippet = directText
        ? ` "${truncateString(directText, COMPACT_TEXT_MAX_LENGTH)}"`
        : "";
      let inner = `<${tagName}${identifyingAttrs}>${textSnippet}`;
      if (componentName) {
        inner += ` in ${componentName}`;
      }
      if (source) {
        const lineReference = isNextProject && source.lineNumber ? `:${source.lineNumber}` : "";
        inner += ` @${source.filePath}${lineReference}`;
      }
      uniqueReferences.add(`[${inner}]`);
    } else {
      uniqueReferences.add(`[${getInlineHTMLPreview(element)}]`);
    }
  }

  return uniqueReferences.size > 0 ? [...uniqueReferences].join("\n") : null;
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
      : await buildCompactContent(elements);

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
