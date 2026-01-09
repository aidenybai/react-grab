import { sourceMapCache, getSourceMap, normalizeFileName } from "bippy/source";
import type { SourceMap } from "bippy/source";

interface SourceMapData {
  [filename: string]: string;
}

const isWeakRef = (
  value: SourceMap | WeakRef<SourceMap> | null,
): value is WeakRef<SourceMap> =>
  typeof WeakRef !== "undefined" && value instanceof WeakRef;

const extractSourceMapData = (sourceMap: SourceMap): SourceMapData => {
  const filenameToContent: SourceMapData = {};

  const processSourcesArray = (
    sources: string[],
    sourcesContent: (string | null)[] | undefined,
  ) => {
    if (!sourcesContent) return;

    for (let index = 0; index < sources.length; index++) {
      const rawFilename = sources[index];
      const fileContent = sourcesContent[index];

      if (!rawFilename || !fileContent) continue;

      const filename = normalizeFileName(rawFilename);
      if (filename && !filenameToContent[filename]) {
        filenameToContent[filename] = fileContent;
      }
    }
  };

  if (sourceMap.sections) {
    for (const section of sourceMap.sections) {
      processSourcesArray(section.map.sources, section.map.sourcesContent);
    }
  }

  processSourcesArray(sourceMap.sources, sourceMap.sourcesContent);

  return filenameToContent;
};

const NON_JS_EXTENSIONS = [
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".json",
  ".html",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
];

const isLikelyJavaScriptUrl = (url: string): boolean => {
  const pathWithoutQuery = url.split("?")[0].toLowerCase();
  return !NON_JS_EXTENSIONS.some((extension) =>
    pathWithoutQuery.endsWith(extension),
  );
};

const isJavaScriptScriptElement = (script: Element): boolean => {
  const typeAttribute = script.getAttribute("type");

  if (!typeAttribute) return true;

  const normalizedType = typeAttribute.toLowerCase().trim();
  return (
    normalizedType === "" ||
    normalizedType === "text/javascript" ||
    normalizedType === "application/javascript" ||
    normalizedType === "module"
  );
};

const getScriptUrlsFromDocument = (): string[] => {
  if (typeof document === "undefined") return [];

  const scriptUrls: string[] = [];
  const seenUrls = new Set<string>();
  const scriptElements = Array.from(document.querySelectorAll("script[src]"));

  for (const script of scriptElements) {
    const srcAttribute = script.getAttribute("src");
    if (!srcAttribute) continue;
    if (!isJavaScriptScriptElement(script)) continue;

    try {
      const absoluteUrl = new URL(srcAttribute, window.location.href).href;

      if (seenUrls.has(absoluteUrl)) continue;
      if (!isLikelyJavaScriptUrl(absoluteUrl)) continue;

      seenUrls.add(absoluteUrl);
      scriptUrls.push(absoluteUrl);
    } catch {
      continue;
    }
  }

  return scriptUrls;
};

const getCachedSourceMapUrls = (): Set<string> => {
  return new Set(sourceMapCache.keys());
};

export const getSourceMapDataFromCache = (): SourceMapData => {
  const filenameToContent: SourceMapData = {};

  for (const cacheEntry of sourceMapCache.values()) {
    const sourceMap =
      cacheEntry === null
        ? null
        : isWeakRef(cacheEntry)
          ? (cacheEntry.deref() ?? null)
          : cacheEntry;

    if (sourceMap) {
      Object.assign(filenameToContent, extractSourceMapData(sourceMap));
    }
  }

  return filenameToContent;
};

export const getSourceMapDataForUrl = async (
  bundleUrl: string,
  fetchFn?: (url: string) => Promise<Response>,
): Promise<SourceMapData> => {
  try {
    const sourceMap = await getSourceMap(bundleUrl, true, fetchFn);
    return sourceMap ? extractSourceMapData(sourceMap) : {};
  } catch {
    return {};
  }
};

export const getSourceMapDataFromScripts = async (
  fetchFn?: (url: string) => Promise<Response>,
): Promise<SourceMapData> => {
  const scriptUrls = getScriptUrlsFromDocument();
  const cachedUrls = getCachedSourceMapUrls();
  const uncachedScriptUrls = scriptUrls.filter((url) => !cachedUrls.has(url));

  const filenameToContent: SourceMapData = {};

  const fetchResults = await Promise.all(
    uncachedScriptUrls.map((url) => getSourceMapDataForUrl(url, fetchFn)),
  );

  for (const fetchedData of fetchResults) {
    Object.assign(filenameToContent, fetchedData);
  }

  return filenameToContent;
};

export const getSourceMapData = async (
  fetchFn?: (url: string) => Promise<Response>,
): Promise<SourceMapData> => {
  const cachedData = getSourceMapDataFromCache();
  const scriptData = await getSourceMapDataFromScripts(fetchFn);

  return { ...cachedData, ...scriptData };
};

export type { SourceMapData };
