import type { ElementContextParts } from "../core/context.js";
import { findLongestCommonSuffix } from "./find-longest-common-suffix.js";

export interface JoinSnippetEntry {
  snippet: string;
  parts: ElementContextParts;
}

interface JoinSnippetEntriesOptions {
  allowCollapse: boolean;
}

const formatStackLines = (stackLines: string[]): string =>
  stackLines.map((line) => `\n  ${line}`).join("");

const renderLegacyMultiEntry = (snippets: string[]): string =>
  snippets.map((snippet, index) => `[${index + 1}]\n${snippet}`).join("\n\n");

export const joinSnippets = (snippets: string[]): string => {
  if (snippets.length <= 1) return snippets[0] ?? "";
  return renderLegacyMultiEntry(snippets);
};

export const joinSnippetEntries = (
  entries: JoinSnippetEntry[],
  options: JoinSnippetEntriesOptions,
): string => {
  if (entries.length === 0) return "";
  if (entries.length === 1) return entries[0].snippet;

  if (!options.allowCollapse) {
    return renderLegacyMultiEntry(entries.map((entry) => entry.snippet));
  }

  const stackLists = entries.map((entry) => entry.parts.stackLines);
  const sharedStack = findLongestCommonSuffix(stackLists);
  if (sharedStack.length === 0) {
    return renderLegacyMultiEntry(entries.map((entry) => entry.snippet));
  }

  const firstSnippetKey = entries[0].parts.sourceSnippet?.key;
  const haveSharedSnippet =
    Boolean(firstSnippetKey) &&
    entries.every((entry) => entry.parts.sourceSnippet?.key === firstSnippetKey);
  const sharedSnippetBlock = haveSharedSnippet ? entries[0].parts.sourceSnippet?.block : null;

  let anyDivergence = false;
  const renderedEntries = entries.map((entry, entryIndex) => {
    const divergingLines = entry.parts.stackLines.slice(
      0,
      entry.parts.stackLines.length - sharedStack.length,
    );
    if (divergingLines.length > 0) anyDivergence = true;
    return `[${entryIndex + 1}] ${entry.parts.htmlPreview}${formatStackLines(divergingLines)}`;
  });

  const entrySeparator = anyDivergence ? "\n\n" : "\n";
  const sections: string[] = [renderedEntries.join(entrySeparator)];
  if (sharedSnippetBlock) sections.push(sharedSnippetBlock);
  sections.push(formatStackLines(sharedStack).trimStart());
  return sections.join("\n\n");
};
