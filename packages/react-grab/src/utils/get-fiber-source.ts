import type { Fiber } from "bippy";
import { formatOwnerStack, hasDebugSource, hasDebugStack, parseStack } from "bippy/source";

// The JSX call site of a fiber as a compact "file:line:col" string, or null.
// Synchronous only: reads `_debugSource` (React 16-18 dev) or parses the first
// frame of `_debugStack` (React 19+ dev). No source-map symbolication - bundled
// URLs only. Ported (trimmed) from react-scan/lite's getFiberSource.
export const getFiberSource = (fiber: Fiber): string | null => {
  if (hasDebugSource(fiber)) {
    const { fileName, lineNumber, columnNumber } = fiber._debugSource;
    return `${fileName}:${lineNumber}:${columnNumber}`;
  }

  if (hasDebugStack(fiber)) {
    try {
      const ownerStack = formatOwnerStack(fiber._debugStack.stack);
      if (ownerStack) {
        const frame = parseStack(ownerStack)[0];
        if (frame?.fileName) {
          return `${frame.fileName}:${frame.lineNumber}:${frame.columnNumber}`;
        }
      }
    } catch {}
  }

  return null;
};
