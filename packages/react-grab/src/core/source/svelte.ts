import type { ElementSourceInfo } from "../../types.js";

const SVELTE_META_PROPERTY_NAME = "__svelte_meta";
const SVELTE_COLUMN_OFFSET = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const getNearestSvelteMeta = (
  element: Element,
): Record<string, unknown> | null => {
  let currentElement: Element | null = element;
  while (currentElement) {
    const svelteMeta = Reflect.get(currentElement, SVELTE_META_PROPERTY_NAME);
    if (isRecord(svelteMeta)) return svelteMeta;
    currentElement = currentElement.parentElement;
  }
  return null;
};

const readSvelteLocation = (
  svelteMeta: Record<string, unknown>,
): { filePath: string; lineNumber: number; columnNumber: number } | null => {
  const location = svelteMeta.loc;
  if (!isRecord(location)) return null;

  const filePath = readString(location.file);
  const lineNumber = readNumber(location.line);
  const rawColumnNumber = readNumber(location.column);
  if (!filePath) return null;
  if (lineNumber === null || rawColumnNumber === null) return null;

  return {
    filePath,
    lineNumber,
    columnNumber: rawColumnNumber + SVELTE_COLUMN_OFFSET,
  };
};

const readComponentNameFromParentMeta = (
  svelteMeta: Record<string, unknown>,
) => {
  let currentParent = svelteMeta.parent;
  while (isRecord(currentParent)) {
    const componentTag = readString(currentParent.componentTag);
    if (componentTag) return componentTag;
    currentParent = currentParent.parent;
  }
  return null;
};

const readSvelteParentStackFrames = (
  svelteMeta: Record<string, unknown>,
): ElementSourceInfo[] => {
  const parentStackFrames: ElementSourceInfo[] = [];
  let currentParent = svelteMeta.parent;

  while (isRecord(currentParent)) {
    const filePath = readString(currentParent.file);
    const lineNumber = readNumber(currentParent.line);
    const rawColumnNumber = readNumber(currentParent.column);
    const componentName = readString(currentParent.componentTag);

    if (filePath && lineNumber !== null && rawColumnNumber !== null) {
      parentStackFrames.push({
        filePath,
        lineNumber,
        columnNumber: rawColumnNumber + SVELTE_COLUMN_OFFSET,
        componentName,
      });
    }

    currentParent = currentParent.parent;
  }

  return parentStackFrames;
};

export const getSvelteStackFrames = (element: Element): ElementSourceInfo[] => {
  const svelteMeta = getNearestSvelteMeta(element);
  if (!svelteMeta) return [];

  const sourceLocation = readSvelteLocation(svelteMeta);
  if (!sourceLocation) return [];

  const stackFrames: ElementSourceInfo[] = [
    {
      filePath: sourceLocation.filePath,
      lineNumber: sourceLocation.lineNumber,
      columnNumber: sourceLocation.columnNumber,
      componentName: readComponentNameFromParentMeta(svelteMeta),
    },
  ];
  const seenFrameIdentities = new Set<string>([
    `${sourceLocation.filePath}:${sourceLocation.lineNumber}:${sourceLocation.columnNumber}`,
  ]);

  const parentStackFrames = readSvelteParentStackFrames(svelteMeta);
  for (const parentStackFrame of parentStackFrames) {
    const frameIdentity = `${parentStackFrame.filePath}:${parentStackFrame.lineNumber ?? ""}:${parentStackFrame.columnNumber ?? ""}`;
    if (seenFrameIdentities.has(frameIdentity)) continue;
    seenFrameIdentities.add(frameIdentity);
    stackFrames.push(parentStackFrame);
  }

  return stackFrames;
};
