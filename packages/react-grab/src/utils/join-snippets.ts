import { findLongestCommonSuffix } from "./find-longest-common-suffix.js";

const STACK_LINE_DELIMITER = "\n  in ";

interface SplitSnippet {
  htmlPreview: string;
  stackLines: string[];
}

const splitSnippet = (snippet: string): SplitSnippet => {
  const firstStackIndex = snippet.indexOf(STACK_LINE_DELIMITER);
  if (firstStackIndex === -1) return { htmlPreview: snippet, stackLines: [] };
  const htmlPreview = snippet.slice(0, firstStackIndex);
  const stackText = snippet.slice(firstStackIndex);
  const stackLines = stackText.split("\n").filter((line) => line.trim().length > 0);
  return { htmlPreview, stackLines };
};

const formatNumberedEntry = (snippet: string, index: number): string =>
  `[${index + 1}]\n${snippet}`;

export const joinSnippets = (snippets: string[]): string => {
  if (snippets.length <= 1) return snippets[0] ?? "";

  const splitEntries = snippets.map(splitSnippet);
  const stackLists = splitEntries.map((entry) => entry.stackLines);
  const sharedSuffix = findLongestCommonSuffix(stackLists);

  if (sharedSuffix.length === 0) {
    return snippets.map(formatNumberedEntry).join("\n\n");
  }

  const isFullySharedStack = splitEntries.every(
    (entry) => entry.stackLines.length === sharedSuffix.length,
  );

  if (isFullySharedStack) {
    const inlineEntries = splitEntries
      .map((entry, entryIndex) => `[${entryIndex + 1}] ${entry.htmlPreview}`)
      .join("\n");
    const sharedStackText = sharedSuffix.join("\n");
    return `${inlineEntries}\n  (all from the same component stack)\n${sharedStackText}`;
  }

  const sections: string[] = [];
  for (let entryIndex = 0; entryIndex < splitEntries.length; entryIndex++) {
    const entry = splitEntries[entryIndex];

    if (entryIndex === 0) {
      sections.push(formatNumberedEntry(snippets[0], 0));
      continue;
    }

    const divergingLines = entry.stackLines.slice(
      0,
      entry.stackLines.length - sharedSuffix.length,
    );
    const divergingText = divergingLines.length > 0 ? `\n${divergingLines.join("\n")}` : "";
    sections.push(
      `[${entryIndex + 1}]\n${entry.htmlPreview}${divergingText}\n  (remaining stack same as [1])`,
    );
  }

  return sections.join("\n\n");
};
