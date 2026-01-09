import { sourceMapCache, getSourceMap, normalizeFileName } from "bippy/source";
import type { SourceMap } from "bippy/source";

interface SourceMapData {
  [filename: string]: string;
}

const isWeakRef = (
  value: SourceMap | WeakRef<SourceMap>,
): value is WeakRef<SourceMap> =>
  typeof WeakRef !== "undefined" && value instanceof WeakRef;

const resolveSourceMapFromCache = (
  cacheEntry: SourceMap | WeakRef<SourceMap> | null,
): SourceMap | null => {
  if (!cacheEntry) return null;
  if (isWeakRef(cacheEntry)) return cacheEntry.deref() ?? null;
  return cacheEntry;
};

const extractSourceMapData = (sourceMap: SourceMap): SourceMapData => {
  const result: SourceMapData = {};

  const processSources = (
    sources: string[],
    contents: (string | null)[] | undefined,
  ) => {
    if (!contents) return;

    for (let i = 0; i < sources.length; i++) {
      const filename = normalizeFileName(sources[i]);
      const content = contents[i];
      if (filename && content && !result[filename]) {
        result[filename] = content;
      }
    }
  };

  if (sourceMap.sections) {
    for (const section of sourceMap.sections) {
      processSources(section.map.sources, section.map.sourcesContent);
    }
  }

  processSources(sourceMap.sources, sourceMap.sourcesContent);
  return result;
};

const hasJavaScriptType = (script: Element): boolean => {
  const type = script.getAttribute("type")?.toLowerCase().trim();
  return (
    !type ||
    type === "text/javascript" ||
    type === "application/javascript" ||
    type === "module"
  );
};

const getScriptUrls = (): string[] => {
  if (typeof document === "undefined") return [];

  const urls = new Set<string>();

  for (const script of Array.from(document.querySelectorAll("script[src]"))) {
    const src = script.getAttribute("src");
    if (!src || !hasJavaScriptType(script)) continue;

    try {
      const url = new URL(src, window.location.href).href;
      if (url.split("?")[0].endsWith(".js")) {
        urls.add(url);
      }
    } catch {
      continue;
    }
  }

  return Array.from(urls);
};

export const getSourceMapDataFromCache = (): SourceMapData => {
  const result: SourceMapData = {};

  for (const cacheEntry of sourceMapCache.values()) {
    const sourceMap = resolveSourceMapFromCache(cacheEntry);
    if (sourceMap) {
      Object.assign(result, extractSourceMapData(sourceMap));
    }
  }

  return result;
};

export const getSourceMapDataForUrl = async (
  url: string,
  fetchFn?: (url: string) => Promise<Response>,
): Promise<SourceMapData> => {
  try {
    const sourceMap = await getSourceMap(url, true, fetchFn);
    return sourceMap ? extractSourceMapData(sourceMap) : {};
  } catch {
    return {};
  }
};

export const getSourceMapDataFromScripts = async (
  fetchFn?: (url: string) => Promise<Response>,
): Promise<SourceMapData> => {
  const cachedUrls = new Set(sourceMapCache.keys());
  const uncachedUrls = getScriptUrls().filter((url) => !cachedUrls.has(url));

  const results = await Promise.all(
    uncachedUrls.map((url) => getSourceMapDataForUrl(url, fetchFn)),
  );

  const combined: SourceMapData = {};
  for (const data of results) {
    Object.assign(combined, data);
  }
  return combined;
};

export const getSourceMapData = async (
  fetchFn?: (url: string) => Promise<Response>,
): Promise<SourceMapData> => {
  const cached = getSourceMapDataFromCache();
  const fromScripts = await getSourceMapDataFromScripts(fetchFn);
  return { ...cached, ...fromScripts };
};

export type { SourceMapData };
