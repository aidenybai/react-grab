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

export const getSourceMapData = (): SourceMapData => {
  const filenameToContent: SourceMapData = {};

  for (const cacheEntry of sourceMapCache.values()) {
    const sourceMap = cacheEntry === null
      ? null
      : isWeakRef(cacheEntry)
        ? cacheEntry.deref() ?? null
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

export const getAllSourceMapData = async (
  bundleUrls?: string[],
  fetchFn?: (url: string) => Promise<Response>,
): Promise<SourceMapData> => {
  const filenameToContent = getSourceMapData();

  if (!bundleUrls || bundleUrls.length === 0) {
    return filenameToContent;
  }

  const fetchResults = await Promise.all(
    bundleUrls.map((url) => getSourceMapDataForUrl(url, fetchFn)),
  );

  for (const fetchedData of fetchResults) {
    Object.assign(filenameToContent, fetchedData);
  }

  return filenameToContent;
};

export type { SourceMapData };
