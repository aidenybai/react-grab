import type { SourceSnippet } from "./get-source-snippet.js";

export const formatSourceSnippetBlock = (snippet: SourceSnippet, filePath: string): string => {
  const headerSuffix = snippet.isApproximate ? " (approximate)" : "";
  const header = `// ${filePath}:${snippet.highlightLine}${headerSuffix}`;

  const lineNumberWidth = String(snippet.endLine).length;
  const formattedLines = snippet.lines.map((line, lineIndex) => {
    const currentLineNumber = snippet.startLine + lineIndex;
    const marker = currentLineNumber === snippet.highlightLine ? "> " : "  ";
    return `${marker}${String(currentLineNumber).padStart(lineNumberWidth, " ")}| ${line}`;
  });

  return `${header}\n${formattedLines.join("\n")}`;
};
