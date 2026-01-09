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

const isJavaScriptType = (typeAttribute: string | null): boolean => {
  if (!typeAttribute) return true;
  const normalizedType = typeAttribute.toLowerCase().trim();
  return (
    normalizedType === "" ||
    normalizedType === "text/javascript" ||
    normalizedType === "application/javascript" ||
    normalizedType === "module"
  );
};

const isJavaScriptUrl = (url: string): boolean => {
  const pathWithoutQuery = url.split("?")[0];
  return (
    pathWithoutQuery.endsWith(".js") ||
    pathWithoutQuery.endsWith(".mjs") ||
    pathWithoutQuery.endsWith(".cjs")
  );
};

const getScriptUrlsFromDocument = (): string[] => {
  if (typeof document === "undefined") return [];

  const scriptUrls: string[] = [];
  const scriptElements = Array.from(document.querySelectorAll("script[src]"));

  for (const script of scriptElements) {
    const srcAttribute = script.getAttribute("src");
    const typeAttribute = script.getAttribute("type");

    if (!srcAttribute) continue;
    if (!isJavaScriptType(typeAttribute)) continue;

    try {
      const absoluteUrl = new URL(srcAttribute, window.location.href).href;
      if (isJavaScriptUrl(absoluteUrl) && !scriptUrls.includes(absoluteUrl)) {
        scriptUrls.push(absoluteUrl);
      }
    } catch {
      continue;
    }
  }

  return scriptUrls;
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
  const sourceMap = await getSourceMap(bundleUrl, true, fetchFn);
  return sourceMap ? extractSourceMapData(sourceMap) : {};
};

export const getSourceMapDataFromScripts = async (
  fetchFn?: (url: string) => Promise<Response>,
): Promise<SourceMapData> => {
  const scriptUrls = getScriptUrlsFromDocument();
  const filenameToContent: SourceMapData = {};

  const fetchResults = await Promise.all(
    scriptUrls.map((url) => getSourceMapDataForUrl(url, fetchFn)),
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
