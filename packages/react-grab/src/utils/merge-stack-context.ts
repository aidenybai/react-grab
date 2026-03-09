const STACK_CONTEXT_LINE_SEPARATOR = "\n";
const STACK_CONTEXT_LINE_PREFIX = "in ";
const STACK_CONTEXT_LINE_INDENT = "\n  ";

const getStackContextLines = (stackContext: string): string[] =>
  stackContext
    .split(STACK_CONTEXT_LINE_SEPARATOR)
    .map((stackLine) => stackLine.trim())
    .filter((stackLine) => stackLine.startsWith(STACK_CONTEXT_LINE_PREFIX))
    .map((stackLine) => `${STACK_CONTEXT_LINE_INDENT}${stackLine}`);

export const mergeStackContext = (
  primaryStackContext: string,
  secondaryStackContext: string,
  maxLines: number,
): string => {
  if (maxLines < 1) return "";

  const mergedStackLines: string[] = [];
  const seenStackLines = new Set<string>();

  for (const stackContext of [primaryStackContext, secondaryStackContext]) {
    const stackContextLines = getStackContextLines(stackContext);
    for (const stackContextLine of stackContextLines) {
      if (seenStackLines.has(stackContextLine)) continue;
      seenStackLines.add(stackContextLine);
      mergedStackLines.push(stackContextLine);
    }
  }

  return mergedStackLines.slice(0, maxLines).join("");
};
