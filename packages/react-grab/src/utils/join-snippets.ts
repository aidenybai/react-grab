export const joinSnippets = (snippets: string[]): string => {
  if (snippets.length <= 1) return snippets[0] ?? "";

  return snippets
    .map((snippet, index) => `[${index + 1}]\n${snippet}`)
    .join("\n\n");
};
