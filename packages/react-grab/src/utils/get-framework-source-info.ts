import type {
  ElementSourceInfo,
  ElementStackContextOptions,
  SourceInfo,
} from "../types.js";
import {
  getSolidSourceInfo,
  getSolidStackFrames,
} from "./get-solid-source-info.js";
import {
  getSvelteSourceInfo,
  getSvelteStackFrames,
} from "./get-svelte-source-info.js";
import { getVueSourceInfo, getVueStackFrames } from "./get-vue-source-info.js";

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

const getResolvedFrameworkSourceInfo = async (
  element: Element,
): Promise<ElementSourceInfo | null> => {
  const resolvers = [
    getSvelteSourceInfo,
    getVueSourceInfo,
    getSolidSourceInfo,
  ] as const;

  for (const resolveSourceInfo of resolvers) {
    const sourceInfo = await resolveSourceInfo(element);
    if (!sourceInfo) continue;
    if (!sourceInfo.filePath) continue;
    return sourceInfo;
  }

  return null;
};

const getResolvedFrameworkStackFrames = async (
  element: Element,
): Promise<ElementSourceInfo[]> => {
  const stackResolvers = [
    getSvelteStackFrames,
    getVueStackFrames,
    getSolidStackFrames,
  ] as const;

  for (const resolveStackFrames of stackResolvers) {
    const stackFrames = await resolveStackFrames(element);
    if (stackFrames.length < 1) continue;
    const validStackFrames = stackFrames.filter(
      (stackFrame) => stackFrame.filePath.length > 0,
    );
    if (validStackFrames.length < 1) continue;
    return validStackFrames;
  }

  return [];
};

const formatStackFrame = (stackFrame: ElementSourceInfo): string => {
  const sourceLocation = formatSourceLocation(stackFrame);
  if (stackFrame.componentName) {
    return `\n  in ${stackFrame.componentName} (at ${sourceLocation})`;
  }
  return `\n  in ${sourceLocation}`;
};

export const getFrameworkSourceInfo = (
  element: Element,
): Promise<ElementSourceInfo | null> => getResolvedFrameworkSourceInfo(element);

export const getFrameworkSourceInfoForApi = (
  element: Element,
): Promise<SourceInfo | null> =>
  getResolvedFrameworkSourceInfo(element).then((sourceInfo) => {
    if (!sourceInfo) return null;
    return {
      filePath: sourceInfo.filePath,
      lineNumber: sourceInfo.lineNumber,
      componentName: sourceInfo.componentName,
    };
  });

export const getFrameworkComponentName = (
  element: Element,
): Promise<string | null> =>
  getResolvedFrameworkSourceInfo(element).then((sourceInfo) => {
    if (!sourceInfo) return null;
    return sourceInfo.componentName;
  });

export const getFrameworkStackContext = (
  element: Element,
  options: ElementStackContextOptions = {},
): Promise<string> =>
  getResolvedFrameworkStackFrames(element).then((stackFrames) => {
    const { maxLines = 3 } = options;
    if (maxLines < 1) return "";
    if (stackFrames.length < 1) return "";

    return stackFrames
      .slice(0, maxLines)
      .map((stackFrame) => formatStackFrame(stackFrame))
      .join("");
  });
