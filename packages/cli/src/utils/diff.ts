interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumber?: number;
}

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const GRAY = "\x1b[90m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

export const generateDiff = (originalContent: string, newContent: string): DiffLine[] => {
  const originalLines = originalContent.split("\n");
  const newLines = newContent.split("\n");
  const diff: DiffLine[] = [];

  const maxLength = Math.max(originalLines.length, newLines.length);

  let originalIndex = 0;
  let newIndex = 0;

  while (originalIndex < originalLines.length || newIndex < newLines.length) {
    const originalLine = originalLines[originalIndex];
    const newLine = newLines[newIndex];

    if (originalLine === newLine) {
      diff.push({ type: "unchanged", content: originalLine, lineNumber: newIndex + 1 });
      originalIndex++;
      newIndex++;
    } else if (originalLine === undefined) {
      diff.push({ type: "added", content: newLine, lineNumber: newIndex + 1 });
      newIndex++;
    } else if (newLine === undefined) {
      diff.push({ type: "removed", content: originalLine });
      originalIndex++;
    } else {
      const originalInNew = newLines.indexOf(originalLine, newIndex);
      const newInOriginal = originalLines.indexOf(newLine, originalIndex);

      if (originalInNew !== -1 && (newInOriginal === -1 || originalInNew - newIndex < newInOriginal - originalIndex)) {
        while (newIndex < originalInNew) {
          diff.push({ type: "added", content: newLines[newIndex], lineNumber: newIndex + 1 });
          newIndex++;
        }
      } else if (newInOriginal !== -1) {
        while (originalIndex < newInOriginal) {
          diff.push({ type: "removed", content: originalLines[originalIndex] });
          originalIndex++;
        }
      } else {
        diff.push({ type: "removed", content: originalLine });
        diff.push({ type: "added", content: newLine, lineNumber: newIndex + 1 });
        originalIndex++;
        newIndex++;
      }
    }
  }

  return diff;
};

export const formatDiff = (diff: DiffLine[], contextLines: number = 3): string => {
  const lines: string[] = [];
  let lastPrintedIndex = -1;
  let hasChanges = false;

  const changedIndices = diff
    .map((line, index) => (line.type !== "unchanged" ? index : -1))
    .filter((index) => index !== -1);

  if (changedIndices.length === 0) {
    return `${GRAY}No changes${RESET}`;
  }

  for (const changedIndex of changedIndices) {
    const startContext = Math.max(0, changedIndex - contextLines);
    const endContext = Math.min(diff.length - 1, changedIndex + contextLines);

    if (startContext > lastPrintedIndex + 1 && lastPrintedIndex !== -1) {
      lines.push(`${GRAY}  ...${RESET}`);
    }

    for (let lineIndex = Math.max(startContext, lastPrintedIndex + 1); lineIndex <= endContext; lineIndex++) {
      const diffLine = diff[lineIndex];

      if (diffLine.type === "added") {
        lines.push(`${GREEN}+ ${diffLine.content}${RESET}`);
        hasChanges = true;
      } else if (diffLine.type === "removed") {
        lines.push(`${RED}- ${diffLine.content}${RESET}`);
        hasChanges = true;
      } else {
        lines.push(`${GRAY}  ${diffLine.content}${RESET}`);
      }

      lastPrintedIndex = lineIndex;
    }
  }

  return hasChanges ? lines.join("\n") : `${GRAY}No changes${RESET}`;
};

export const printDiff = (filePath: string, originalContent: string, newContent: string): void => {
  console.log(`\n${BOLD}File: ${filePath}${RESET}`);
  console.log("─".repeat(60));

  const diff = generateDiff(originalContent, newContent);
  console.log(formatDiff(diff));

  console.log("─".repeat(60));
};
