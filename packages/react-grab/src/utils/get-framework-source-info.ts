import type {
  ElementSourceInfo,
  ElementStackContextOptions,
  SourceInfo,
} from "../types.js";
import { getSolidSourceInfo } from "./get-solid-source-info.js";
import { getSvelteSourceInfo } from "./get-svelte-source-info.js";
import { getVueSourceInfo } from "./get-vue-source-info.js";

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
  getResolvedFrameworkSourceInfo(element).then((sourceInfo) => {
    const { maxLines = 3 } = options;
    if (maxLines < 1) return "";

    if (!sourceInfo) return "";

    const sourceLocation = formatSourceLocation(sourceInfo);
    if (sourceInfo.componentName) {
      return `\n  in ${sourceInfo.componentName} (at ${sourceLocation})`;
    }

    return `\n  in ${sourceLocation}`;
  });
