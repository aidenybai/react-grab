import { sourceMapCache, getSourceMap, normalizeFileName } from "bippy/source";
import type { SourceMap } from "bippy/source";

interface SourceMapData {
  [filename: string]: string;
}

const isWeakRef = (
  cacheValue: SourceMap | WeakRef<SourceMap> | null,
): cacheValue is WeakRef<SourceMap> =>
  typeof WeakRef !== "undefined" && cacheValue instanceof WeakRef;

const extractSourceMapData = (sourceMap: SourceMap): SourceMapData => {
  const filenameToContent: SourceMapData = {};

  const processSourcesArray = (
    sourceFilenames: string[],
    sourceFileContents: (string | null)[] | undefined,
  ) => {
    if (!sourceFileContents) return;

    for (
      let sourceIndex = 0;
      sourceIndex < sourceFilenames.length;
      sourceIndex++
    ) {
      const rawSourceFilename = sourceFilenames[sourceIndex];
      const sourceFileContent = sourceFileContents[sourceIndex];

      if (!rawSourceFilename || !sourceFileContent) continue;

      const normalizedFilename = normalizeFileName(rawSourceFilename);
      if (normalizedFilename && !filenameToContent[normalizedFilename]) {
        filenameToContent[normalizedFilename] = sourceFileContent;
      }
    }
  };

  if (sourceMap.sections) {
    for (const sourceMapSection of sourceMap.sections) {
      processSourcesArray(
        sourceMapSection.map.sources,
        sourceMapSection.map.sourcesContent,
      );
    }
  }

  processSourcesArray(sourceMap.sources, sourceMap.sourcesContent);

  return filenameToContent;
};

const isJavaScriptUrl = (scriptUrl: string): boolean => {
  const urlPathWithoutQueryString = scriptUrl.split("?")[0].toLowerCase();
  return urlPathWithoutQueryString.endsWith(".js");
};

const isJavaScriptScriptElement = (scriptElement: Element): boolean => {
  const typeAttribute = scriptElement.getAttribute("type");

  if (!typeAttribute) return true;

  const normalizedTypeAttribute = typeAttribute.toLowerCase().trim();
  return (
    normalizedTypeAttribute === "" ||
    normalizedTypeAttribute === "text/javascript" ||
    normalizedTypeAttribute === "application/javascript" ||
    normalizedTypeAttribute === "module"
  );
};

const getScriptUrlsFromDocument = (): string[] => {
  if (typeof document === "undefined") return [];

  const discoveredScriptUrls: string[] = [];
  const alreadyProcessedUrls = new Set<string>();
  const scriptElements = Array.from(document.querySelectorAll("script[src]"));

  for (const scriptElement of scriptElements) {
    const srcAttribute = scriptElement.getAttribute("src");
    if (!srcAttribute) continue;
    if (!isJavaScriptScriptElement(scriptElement)) continue;

    try {
      const absoluteScriptUrl = new URL(srcAttribute, window.location.href)
        .href;

      if (alreadyProcessedUrls.has(absoluteScriptUrl)) continue;
      if (!isJavaScriptUrl(absoluteScriptUrl)) continue;

      alreadyProcessedUrls.add(absoluteScriptUrl);
      discoveredScriptUrls.push(absoluteScriptUrl);
    } catch {
      continue;
    }
  }

  return discoveredScriptUrls;
};

const getAlreadyCachedSourceMapUrls = (): Set<string> => {
  return new Set(sourceMapCache.keys());
};

export const getSourceMapDataFromCache = (): SourceMapData => {
  const filenameToContent: SourceMapData = {};

  for (const sourceMapCacheEntry of sourceMapCache.values()) {
    const resolvedSourceMap =
      sourceMapCacheEntry === null
        ? null
        : isWeakRef(sourceMapCacheEntry)
          ? (sourceMapCacheEntry.deref() ?? null)
          : sourceMapCacheEntry;

    if (resolvedSourceMap) {
      Object.assign(filenameToContent, extractSourceMapData(resolvedSourceMap));
    }
  }

  return filenameToContent;
};

export const getSourceMapDataForUrl = async (
  bundleUrl: string,
  fetchFunction?: (url: string) => Promise<Response>,
): Promise<SourceMapData> => {
  try {
    const sourceMap = await getSourceMap(bundleUrl, true, fetchFunction);
    return sourceMap ? extractSourceMapData(sourceMap) : {};
  } catch {
    return {};
  }
};

export const getSourceMapDataFromScripts = async (
  fetchFunction?: (url: string) => Promise<Response>,
): Promise<SourceMapData> => {
  const allScriptUrls = getScriptUrlsFromDocument();
  const alreadyCachedUrls = getAlreadyCachedSourceMapUrls();
  const scriptUrlsNotYetCached = allScriptUrls.filter(
    (scriptUrl) => !alreadyCachedUrls.has(scriptUrl),
  );

  const filenameToContent: SourceMapData = {};

  const sourceMapFetchResults = await Promise.all(
    scriptUrlsNotYetCached.map((scriptUrl) =>
      getSourceMapDataForUrl(scriptUrl, fetchFunction),
    ),
  );

  for (const fetchedSourceMapData of sourceMapFetchResults) {
    Object.assign(filenameToContent, fetchedSourceMapData);
  }

  return filenameToContent;
};

export const getSourceMapData = async (
  fetchFunction?: (url: string) => Promise<Response>,
): Promise<SourceMapData> => {
  const cachedSourceMapData = getSourceMapDataFromCache();
  const scriptSourceMapData = await getSourceMapDataFromScripts(fetchFunction);

  return { ...cachedSourceMapData, ...scriptSourceMapData };
};

export type { SourceMapData };
