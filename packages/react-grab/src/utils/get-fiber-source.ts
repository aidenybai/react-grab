import type { Fiber } from "bippy";
import { formatOwnerStack, hasDebugSource, hasDebugStack, parseStack } from "bippy/source";

// JSX call site as "file:line:col", or null. Sync, dev-only, no symbolication:
// `_debugSource` (React 16-18) or the first `_debugStack` frame (React 19+).
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
