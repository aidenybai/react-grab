import { formatElementContextParts } from "./context.js";
import { copyContent, type ReactGrabEntry } from "../utils/copy-content.js";
import { generateSnippetParts } from "../utils/generate-snippet.js";
import { joinSnippetEntries, type JoinSnippetEntry } from "../utils/join-snippets.js";
import { normalizeError } from "../utils/normalize-error.js";

interface CopyOptions {
  maxContextLines?: number;
  getContent?: (elements: Element[]) => Promise<string> | string;
  componentName?: string;
}

interface CopyHooks {
  onBeforeCopy: (elements: Element[]) => Promise<void>;
  transformSnippet: (snippet: string, element: Element) => Promise<string>;
  transformCopyContent: (content: string, elements: Element[]) => Promise<string>;
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
      const partsList = await generateSnippetParts(elements, {
        maxLines: options.maxContextLines,
      });
      const originalSnippets = partsList.map(formatElementContextParts);
      const transformedSnippets = await Promise.all(
        originalSnippets.map((snippet, index) =>
          snippet.trim() ? hooks.transformSnippet(snippet, elements[index]) : Promise.resolve(""),
        ),
      );

      // Plugin transforms can mutate snippet text, breaking the structured
      // `parts` invariant the collapse algorithm relies on.
      let allowCollapse = true;
      const joinEntries: JoinSnippetEntry[] = [];
      const trackedElements: Element[] = [];
      for (let entryIndex = 0; entryIndex < transformedSnippets.length; entryIndex++) {
        const transformed = transformedSnippets[entryIndex];
        if (!transformed.trim()) continue;
        if (transformed !== originalSnippets[entryIndex]) allowCollapse = false;
        joinEntries.push({
          snippet: transformed,
          parts: partsList[entryIndex],
        });
        trackedElements.push(elements[entryIndex]);
      }

      generatedContent = joinSnippetEntries(joinEntries, { allowCollapse });
      entries = joinEntries.map((entry, entryIndex) => ({
        tagName: trackedElements[entryIndex].localName,
        content: entry.snippet,
        commentText: extraPrompt,
      }));
    }

    if (generatedContent.trim()) {
      const transformedContent = await hooks.transformCopyContent(generatedContent, elements);

      copiedContent = extraPrompt ? `${extraPrompt}\n\n${transformedContent}` : transformedContent;

      didCopy = copyContent(copiedContent, {
        componentName: options.componentName,
        entries,
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
