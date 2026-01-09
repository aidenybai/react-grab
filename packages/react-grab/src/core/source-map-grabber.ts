import { sourceMapCache, getSourceMap, normalizeFileName } from "bippy/source";
import type { SourceMap } from "bippy/source";

interface SourceMapData {
  [filename: string]: string;
}

interface SectionMap {
  sources: string[];
  sourcesContent?: string[];
}

const isWeakRef = (
  value: SourceMap | WeakRef<SourceMap> | null,
): value is WeakRef<SourceMap> =>
  typeof WeakRef !== "undefined" && value instanceof WeakRef;

const resolveSourceMap = (
  entry: SourceMap | WeakRef<SourceMap> | null,
): SourceMap | null => {
  if (entry === null) {
    return null;
  }
  if (isWeakRef(entry)) {
    return entry.deref() ?? null;
  }
  return entry;
};

const extractSourcesFromMap = (
  sources: string[],
  sourcesContent: (string | null)[] | undefined,
  data: SourceMapData,
): void => {
  if (!sourcesContent || sourcesContent.length === 0) {
    return;
  }

  for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
    const source = sources[sourceIndex];
    const content = sourcesContent[sourceIndex];

    if (!source || !content) {
      continue;
    }

    const normalizedFilename = normalizeFileName(source);
    if (normalizedFilename && !data[normalizedFilename]) {
      data[normalizedFilename] = content;
    }
  }
};

const extractDataFromSectionMap = (
  sectionMap: SectionMap,
  data: SourceMapData,
): void => {
  extractSourcesFromMap(sectionMap.sources, sectionMap.sourcesContent, data);
};

const extractDataFromSourceMap = (
  sourceMap: SourceMap,
  data: SourceMapData,
): void => {
  const { sources, sourcesContent, sections } = sourceMap;

  if (sections && sections.length > 0) {
    for (const section of sections) {
      extractDataFromSectionMap(section.map as SectionMap, data);
    }
  }

  extractSourcesFromMap(sources, sourcesContent, data);
};

export const getSourceMapData = (): SourceMapData => {
  const data: SourceMapData = {};

  for (const entry of sourceMapCache.values()) {
    const sourceMap = resolveSourceMap(entry);
    if (sourceMap) {
      extractDataFromSourceMap(sourceMap, data);
    }
  }

  return data;
};

export const getSourceMapDataForUrl = async (
  bundleUrl: string,
  fetchFn?: (url: string) => Promise<Response>,
): Promise<SourceMapData> => {
  const data: SourceMapData = {};

  const sourceMap = await getSourceMap(bundleUrl, true, fetchFn);
  if (sourceMap) {
    extractDataFromSourceMap(sourceMap, data);
  }

  return data;
};

export const addSourceMapData = (
  existingData: SourceMapData,
  newData: SourceMapData,
): SourceMapData => {
  return { ...existingData, ...newData };
};

export const getAllSourceMapData = async (
  bundleUrls?: string[],
  fetchFn?: (url: string) => Promise<Response>,
): Promise<SourceMapData> => {
  const cachedData = getSourceMapData();

  if (!bundleUrls || bundleUrls.length === 0) {
    return cachedData;
  }

  const fetchedDataPromises = bundleUrls.map((url) =>
    getSourceMapDataForUrl(url, fetchFn),
  );
  const fetchedDataResults = await Promise.all(fetchedDataPromises);

  let combinedData = cachedData;
  for (const fetchedData of fetchedDataResults) {
    combinedData = addSourceMapData(combinedData, fetchedData);
  }

  return combinedData;
};

export type { SourceMapData };
