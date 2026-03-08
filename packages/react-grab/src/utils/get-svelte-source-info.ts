import type { ElementSourceInfo } from "../types.js";

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

export const getSvelteSourceInfo = (
  element: Element,
): ElementSourceInfo | null => {
  const svelteMeta = getNearestSvelteMeta(element);
  if (!svelteMeta) return null;

  const sourceLocation = readSvelteLocation(svelteMeta);
  if (!sourceLocation) return null;

  return {
    filePath: sourceLocation.filePath,
    lineNumber: sourceLocation.lineNumber,
    columnNumber: sourceLocation.columnNumber,
    componentName: readComponentNameFromParentMeta(svelteMeta),
  };
};
