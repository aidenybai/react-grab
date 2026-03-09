import type {
  ElementSourceInfo,
  ElementStackContextOptions,
} from "../types.js";

const formatSourceLocation = (sourceInfo: ElementSourceInfo): string => {
  const locationParts = [sourceInfo.filePath];
  if (sourceInfo.lineNumber !== null) {
    locationParts.push(String(sourceInfo.lineNumber));
  }
  if (sourceInfo.columnNumber !== null) {
    locationParts.push(String(sourceInfo.columnNumber));
  }
  return locationParts.join(":");
};

export const formatStackFrame = (stackFrame: ElementSourceInfo): string => {
  const sourceLocation = formatSourceLocation(stackFrame);
  if (stackFrame.componentName) {
    return `\n  in ${stackFrame.componentName} (at ${sourceLocation})`;
  }
  return `\n  in ${sourceLocation}`;
};

export const formatElementStack = (
  stack: ElementSourceInfo[],
  options: ElementStackContextOptions = {},
): string => {
  const { maxLines = 3 } = options;
  if (maxLines < 1 || stack.length < 1) return "";

  return stack
    .slice(0, maxLines)
    .map((stackFrame) => formatStackFrame(stackFrame))
    .join("");
};
