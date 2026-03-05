import {
  getFiberFromHostInstance,
  isCompositeFiber,
  getDisplayName,
} from "bippy";
import { domToPaper } from "@react-grab/paper";
import { copyContent, type ReactGrabEntry } from "../utils/copy-content.js";
import { generateSnippet } from "../utils/generate-snippet.js";
import { joinSnippets } from "../utils/join-snippets.js";

const getReactComponentName = (element: Element): string | null => {
  try {
    const fiber = getFiberFromHostInstance(element);
    if (!fiber) return null;

    const parentFiber = fiber.return;
    if (!parentFiber || !isCompositeFiber(parentFiber)) return null;

    const componentName = getDisplayName(parentFiber);
    if (!componentName) return null;

    if (
      element.parentElement &&
      getFiberFromHostInstance(element.parentElement)?.return === parentFiber
    ) {
      return null;
    }

    return componentName;
  } catch {
    return null;
  }
};

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
    let entries: ReactGrabEntry[] | undefined;

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
      const snippetElementPairs = transformedSnippets
        .map((snippet, index) => ({ snippet, element: elements[index] }))
        .filter(({ snippet }) => snippet.trim());

      generatedContent = joinSnippets(
        snippetElementPairs.map(({ snippet }) => snippet),
      );
      entries = snippetElementPairs.map(({ snippet, element }) => ({
        tagName: element.localName,
        content: snippet,
        commentText: extraPrompt,
      }));
    }

    if (generatedContent.trim()) {
      const transformedContent = await hooks.transformCopyContent(
        generatedContent,
        elements,
      );

      copiedContent = extraPrompt
        ? `${extraPrompt}\n\n${transformedContent}`
        : transformedContent;

      let paperHtml: string | undefined;
      try {
        paperHtml = domToPaper(elements, {
          getComponentName: getReactComponentName,
        }) || undefined;
      } catch (paperError) {
        console.error("[react-grab] Paper conversion failed:", paperError);
      }
      didCopy = copyContent(copiedContent, {
        componentName: options.componentName,
        entries,
        paperHtml,
      });
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
