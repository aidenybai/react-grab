import type { ElementSourceInfo } from "../../types.js";
import { parseSourceLocation } from "./parse-location.js";

interface SolidRuntimeModuleRecord {
  url: string;
  content: string;
}

interface SolidHandlerCandidate {
  source: string;
}

interface SolidHandlerSourceMatch {
  moduleUrl: string;
  moduleContent: string;
  handlerSourceIndex: number;
}

interface SolidLocationMatch {
  sourceInfo: ElementSourceInfo;
  distance: number;
}

const SOLID_RUNTIME_MODULES_GLOBAL_NAME =
  "__REACT_GRAB_SOLID_RUNTIME_MODULES__";
const SOLID_HANDLER_PREFIX = "$$";
const SOURCE_LOCATION_PATTERN = /location:\s*["']([^"']+:\d+:\d+)["']/g;
const MAX_SOURCE_CONTEXT_WINDOW_CHARS = 4000;
const SOURCE_CONTEXT_HALF_WINDOW_CHARS = MAX_SOURCE_CONTEXT_WINDOW_CHARS / 2;
const SOURCE_CONTEXT_WINDOW_START_CHARS = 0;
const SOURCE_LINE_START_COLUMN = 1;
const SOURCE_MODULE_PATH_PREFIX = "/src/";
const CSS_FILE_EXTENSION = ".css";
const IMAGE_IMPORT_SUFFIX = "?import";
const MODULE_SOURCE_CACHE = new Map<string, Promise<string | null>>();
const SOLID_HANDLER_STACK_CACHE = new Map<
  string,
  Promise<ElementSourceInfo[]>
>();
const SOLID_HANDLER_SOURCE_LENGTH_MIN_CHARS = 3;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const readRuntimeModulesFromWindow = (): SolidRuntimeModuleRecord[] => {
  if (typeof window === "undefined") return [];
  const rawRuntimeModules = Reflect.get(
    window,
    SOLID_RUNTIME_MODULES_GLOBAL_NAME,
  );
  if (!Array.isArray(rawRuntimeModules)) return [];

  return rawRuntimeModules
    .map((rawRuntimeModule) => {
      if (!isRecord(rawRuntimeModule)) return null;
      const url = readString(rawRuntimeModule.url);
      const content = readString(rawRuntimeModule.content);
      if (!url || !content) return null;
      return { url, content };
    })
    .filter((runtimeModule): runtimeModule is SolidRuntimeModuleRecord =>
      Boolean(runtimeModule),
    );
};

const shouldIncludeSourceModule = (resourceUrl: string): boolean => {
  if (resourceUrl.includes(IMAGE_IMPORT_SUFFIX)) return false;
  const resourcePath = new URL(resourceUrl, window.location.href).pathname;
  if (resourcePath.endsWith(CSS_FILE_EXTENSION)) return false;
  return resourcePath.includes(SOURCE_MODULE_PATH_PREFIX);
};

const readSourceModuleUrlsFromPerformance = (): string[] => {
  if (typeof window === "undefined") return [];
  const resourceEntries = performance.getEntriesByType("resource");
  const uniqueModuleUrls = new Set<string>();

  for (const resourceEntry of resourceEntries) {
    const resourceUrl = resourceEntry.name;
    if (!resourceUrl) continue;
    if (!shouldIncludeSourceModule(resourceUrl)) continue;
    uniqueModuleUrls.add(resourceUrl);
  }

  return Array.from(uniqueModuleUrls);
};

const getSourceModuleContent = async (
  moduleUrl: string,
): Promise<string | null> => {
  const cachedSource = MODULE_SOURCE_CACHE.get(moduleUrl);
  if (cachedSource) return cachedSource;

  const sourcePromise = fetch(moduleUrl)
    .then((response) => {
      if (!response.ok) return null;
      return response.text();
    })
    .catch(() => null);

  MODULE_SOURCE_CACHE.set(moduleUrl, sourcePromise);
  return sourcePromise;
};

const resolveHandlerSourceMatch = async (
  handlerSource: string,
): Promise<SolidHandlerSourceMatch | null> => {
  const runtimeModules = readRuntimeModulesFromWindow();
  if (runtimeModules.length > 0) {
    for (const runtimeModule of runtimeModules) {
      const handlerSourceIndex = runtimeModule.content.indexOf(handlerSource);
      if (handlerSourceIndex === -1) continue;
      return {
        moduleUrl: runtimeModule.url,
        moduleContent: runtimeModule.content,
        handlerSourceIndex,
      };
    }
  }

  const sourceModuleUrls = readSourceModuleUrlsFromPerformance();
  for (const sourceModuleUrl of sourceModuleUrls) {
    const sourceModuleContent = await getSourceModuleContent(sourceModuleUrl);
    if (!sourceModuleContent) continue;
    const handlerSourceIndex = sourceModuleContent.indexOf(handlerSource);
    if (handlerSourceIndex === -1) continue;
    return {
      moduleUrl: sourceModuleUrl,
      moduleContent: sourceModuleContent,
      handlerSourceIndex,
    };
  }

  return null;
};

const parseLocationLiteralsByDistance = (
  moduleContent: string,
  handlerSourceIndex: number,
): ElementSourceInfo[] => {
  const contextWindowStartIndex = Math.max(
    SOURCE_CONTEXT_WINDOW_START_CHARS,
    handlerSourceIndex - SOURCE_CONTEXT_HALF_WINDOW_CHARS,
  );
  const contextWindowEndIndex = Math.min(
    moduleContent.length,
    handlerSourceIndex + SOURCE_CONTEXT_HALF_WINDOW_CHARS,
  );
  const contextWindowText = moduleContent.slice(
    contextWindowStartIndex,
    contextWindowEndIndex,
  );
  const locationMatches: SolidLocationMatch[] = [];

  for (const locationMatch of contextWindowText.matchAll(
    SOURCE_LOCATION_PATTERN,
  )) {
    const rawLocation = locationMatch[1];
    if (!rawLocation) continue;
    const parsedLocation = parseSourceLocation(rawLocation);
    if (!parsedLocation) continue;

    const matchIndex = locationMatch.index;
    if (matchIndex === undefined) continue;
    const absoluteMatchIndex = contextWindowStartIndex + matchIndex;
    const locationDistance = Math.abs(absoluteMatchIndex - handlerSourceIndex);
    locationMatches.push({
      sourceInfo: {
        filePath: parsedLocation.filePath,
        lineNumber: parsedLocation.lineNumber,
        columnNumber: parsedLocation.columnNumber,
        componentName: null,
      },
      distance: locationDistance,
    });
  }

  locationMatches.sort((leftLocationMatch, rightLocationMatch) => {
    const leftLineNumber = leftLocationMatch.sourceInfo.lineNumber ?? 0;
    const rightLineNumber = rightLocationMatch.sourceInfo.lineNumber ?? 0;
    if (rightLineNumber !== leftLineNumber) {
      return rightLineNumber - leftLineNumber;
    }
    return leftLocationMatch.distance - rightLocationMatch.distance;
  });

  const seenLocations = new Set<string>();
  const uniqueLocationFrames: ElementSourceInfo[] = [];

  for (const locationMatch of locationMatches) {
    const locationIdentity = `${locationMatch.sourceInfo.filePath}:${locationMatch.sourceInfo.lineNumber}:${locationMatch.sourceInfo.columnNumber}`;
    if (seenLocations.has(locationIdentity)) continue;
    seenLocations.add(locationIdentity);
    uniqueLocationFrames.push(locationMatch.sourceInfo);
  }

  return uniqueLocationFrames;
};

const toProjectRelativeModulePath = (moduleUrl: string): string | null => {
  try {
    const parsedUrl = new URL(moduleUrl, window.location.href);
    const sourceModulePath = decodeURIComponent(parsedUrl.pathname);
    if (!sourceModulePath.includes(SOURCE_MODULE_PATH_PREFIX)) return null;
    return sourceModulePath.startsWith("/")
      ? sourceModulePath.slice(1)
      : sourceModulePath;
  } catch {
    return null;
  }
};

const getGeneratedLocationFromModule = (
  moduleContent: string,
  handlerSourceIndex: number,
): { lineNumber: number; columnNumber: number } => {
  const prefixContent = moduleContent.slice(
    SOURCE_CONTEXT_WINDOW_START_CHARS,
    handlerSourceIndex,
  );
  const sourceLines = prefixContent.split("\n");
  const lineNumber = sourceLines.length;
  const previousLine = sourceLines[sourceLines.length - 1] ?? "";
  const columnNumber = previousLine.length + SOURCE_LINE_START_COLUMN;

  return {
    lineNumber,
    columnNumber,
  };
};

const findSolidHandlerCandidate = (
  element: Element,
): SolidHandlerCandidate | null => {
  let currentElement: Element | null = element;

  while (currentElement) {
    const ownPropertyNames = Object.getOwnPropertyNames(currentElement);
    for (const ownPropertyName of ownPropertyNames) {
      if (!ownPropertyName.startsWith(SOLID_HANDLER_PREFIX)) continue;
      const ownPropertyValue = Reflect.get(currentElement, ownPropertyName);
      if (typeof ownPropertyValue !== "function") continue;
      const handlerSource = String(ownPropertyValue).trim();
      if (handlerSource.length < SOLID_HANDLER_SOURCE_LENGTH_MIN_CHARS) {
        continue;
      }
      return {
        source: handlerSource,
      };
    }
    currentElement = currentElement.parentElement;
  }

  return null;
};

const buildGeneratedFrameFromModuleMatch = (
  handlerSourceMatch: SolidHandlerSourceMatch,
): ElementSourceInfo | null => {
  const modulePath = toProjectRelativeModulePath(handlerSourceMatch.moduleUrl);
  if (!modulePath) return null;

  const generatedLocation = getGeneratedLocationFromModule(
    handlerSourceMatch.moduleContent,
    handlerSourceMatch.handlerSourceIndex,
  );

  return {
    filePath: modulePath,
    lineNumber: generatedLocation.lineNumber,
    columnNumber: generatedLocation.columnNumber,
    componentName: null,
  };
};

const resolveSolidStackFramesFromHandler = async (
  handlerSource: string,
): Promise<ElementSourceInfo[]> => {
  const cachedStackFrames = SOLID_HANDLER_STACK_CACHE.get(handlerSource);
  if (cachedStackFrames) return cachedStackFrames;

  const stackFramesPromise = (async () => {
    const handlerSourceMatch = await resolveHandlerSourceMatch(handlerSource);
    if (!handlerSourceMatch) return [];

    const locationLiteralStackFrames = parseLocationLiteralsByDistance(
      handlerSourceMatch.moduleContent,
      handlerSourceMatch.handlerSourceIndex,
    );
    if (locationLiteralStackFrames.length > 0)
      return locationLiteralStackFrames;

    const generatedStackFrame =
      buildGeneratedFrameFromModuleMatch(handlerSourceMatch);
    if (!generatedStackFrame) return [];
    return [generatedStackFrame];
  })();

  SOLID_HANDLER_STACK_CACHE.set(handlerSource, stackFramesPromise);
  return stackFramesPromise;
};

export const getSolidStackFrames = (
  element: Element,
): Promise<ElementSourceInfo[]> => {
  const solidHandlerCandidate = findSolidHandlerCandidate(element);
  if (!solidHandlerCandidate) return Promise.resolve([]);
  return resolveSolidStackFramesFromHandler(solidHandlerCandidate.source);
};
