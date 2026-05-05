import { isSourceFile, sourceMapCache, type SourceMap, type StackFrame } from "bippy/source";
import {
  SOURCE_SNIPPET_FETCH_TIMEOUT_MS,
  SOURCE_SNIPPET_LINES_AFTER,
  SOURCE_SNIPPET_LINES_BEFORE,
  SOURCE_SNIPPET_MAX_LINE_LENGTH_CHARS,
} from "../constants.js";
import { escapeRegExp } from "./escape-regexp.js";
import { truncateString } from "./truncate-string.js";

export interface SourceSnippet {
  startLine: number;
  endLine: number;
  highlightLine: number;
  lines: string[];
  isApproximate: boolean;
}

const sourceContentByFile = new Map<string, Promise<string | null>>();

// Vite serves transformed code at the same URL as the original (`/src/Foo.tsx`
// returns `_jsxDEV(...)` instead of JSX). Reject those fingerprints so we
// don't show the agent rewritten output that has lost the call site.
const TRANSFORMED_OUTPUT_PATTERN =
  /\b_jsxDEV\(|\b_jsx\(|\bjsxRuntime\b|\$RefreshSig\$|var _jsxFileName\s*=/;
const TRANSFORMED_DETECTION_HEAD_CHARS = 2_000;

export const looksTransformed = (content: string): boolean =>
  TRANSFORMED_OUTPUT_PATTERN.test(content.slice(0, TRANSFORMED_DETECTION_HEAD_CHARS));

// Suffix matching covers bundlers that prefix `sources` entries
// (`webpack://`, `vite://`, etc). Require ≥2 path segments so a basename like
// `index.tsx` can't false-match an unrelated module in another cached map.
const MIN_SUFFIX_SEGMENTS = 2;

const findContentBySuffixMatch = (sourceMap: SourceMap, fileName: string): string | null => {
  if (!sourceMap.sources || !sourceMap.sourcesContent) return null;
  const lookupSuffix = fileName.startsWith("/") ? fileName : `/${fileName}`;
  if (lookupSuffix.split("/").length - 1 < MIN_SUFFIX_SEGMENTS) return null;
  for (let sourceIndex = 0; sourceIndex < sourceMap.sources.length; sourceIndex++) {
    const sourceEntry = sourceMap.sources[sourceIndex];
    if (!sourceEntry) continue;
    if (sourceEntry.endsWith(lookupSuffix)) {
      const content = sourceMap.sourcesContent[sourceIndex];
      if (content) return content;
    }
  }
  return null;
};

const findContentInSourceMap = (
  sourceMap: SourceMap | undefined,
  fileName: string,
): string | null => {
  if (!sourceMap?.sources || !sourceMap.sourcesContent) return null;
  const exactIndex = sourceMap.sources.indexOf(fileName);
  if (exactIndex !== -1) {
    const content = sourceMap.sourcesContent[exactIndex];
    if (content) return content;
  }
  const suffixMatch = findContentBySuffixMatch(sourceMap, fileName);
  if (suffixMatch) return suffixMatch;
  if (sourceMap.sections) {
    for (const section of sourceMap.sections) {
      const content = findContentInSourceMap(section.map, fileName);
      if (content) return content;
    }
  }
  return null;
};

const findCachedSourceContent = (fileName: string): string | null => {
  for (const cached of sourceMapCache.values()) {
    if (!cached) continue;
    const sourceMap = cached instanceof WeakRef ? cached.deref() : cached;
    if (!sourceMap) continue;
    const content = findContentInSourceMap(sourceMap, fileName);
    if (content) return content;
  }
  return null;
};

// Same-origin only: prevents a doctored `_debugSource.fileName` from causing
// the dev's browser to fetch attacker URLs. Also rejects `//host/...`
// protocol-relative URLs that string-prefix checks would let through.
const isFetchableUrl = (fileName: string): boolean => {
  if (typeof location === "undefined") return false;
  try {
    return new URL(fileName, location.origin).origin === location.origin;
  } catch {
    return false;
  }
};

const fetchOriginalSource = async (fileName: string): Promise<string | null> => {
  if (!isFetchableUrl(fileName)) return null;

  const url = new URL(fileName, location.origin).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_SNIPPET_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const body = await response.text();
    if (looksTransformed(body)) return null;
    return body;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

// Cache in-flight promises to dedupe concurrent calls, but evict null results
// so a transient HMR-rebuild failure doesn't permanently block snippets for
// that file.
const getSourceContent = (fileName: string): Promise<string | null> => {
  const cached = sourceContentByFile.get(fileName);
  if (cached) return cached;

  const fromMap = findCachedSourceContent(fileName);
  if (fromMap) {
    const resolved = Promise.resolve(fromMap);
    sourceContentByFile.set(fileName, resolved);
    return resolved;
  }

  const promise = fetchOriginalSource(fileName);
  sourceContentByFile.set(fileName, promise);
  promise
    .then((value) => {
      if (value === null && sourceContentByFile.get(fileName) === promise) {
        sourceContentByFile.delete(fileName);
      }
    })
    .catch(() => {
      if (sourceContentByFile.get(fileName) === promise) {
        sourceContentByFile.delete(fileName);
      }
    });
  return promise;
};

// Match only proper component tags (`<UpperCase`). Looser tokens like `=>` or
// `function` trigger on every utility file and silently mark wrong-target
// resolutions as trustworthy.
const JSX_TAG_PATTERN = /<[A-Z][A-Za-z0-9]*[\s/>]/;

const isSnippetTrustworthy = (windowLines: string[], componentName: string | null): boolean => {
  const joined = windowLines.join("\n");
  if (!joined.trim()) return false;
  if (JSX_TAG_PATTERN.test(joined)) return true;
  if (componentName) {
    const componentNamePattern = new RegExp(`\\b${escapeRegExp(componentName)}\\b`);
    if (componentNamePattern.test(joined)) return true;
  }
  return false;
};

const sliceSnippetWindow = (
  sourceLines: string[],
  resolvedLineNumber: number,
): { startLine: number; endLine: number; lines: string[] } | null => {
  if (resolvedLineNumber < 1 || resolvedLineNumber > sourceLines.length) return null;

  const startLine = Math.max(1, resolvedLineNumber - SOURCE_SNIPPET_LINES_BEFORE);
  const endLine = Math.min(sourceLines.length, resolvedLineNumber + SOURCE_SNIPPET_LINES_AFTER);
  const lines = sourceLines
    .slice(startLine - 1, endLine)
    .map((line) => truncateString(line, SOURCE_SNIPPET_MAX_LINE_LENGTH_CHARS));

  return { startLine, endLine, lines };
};

interface GetSourceSnippetOptions {
  componentName?: string | null;
}

export const getSourceSnippetForFrame = async (
  frame: StackFrame,
  options: GetSourceSnippetOptions = {},
): Promise<SourceSnippet | null> => {
  if (!frame.fileName || !isSourceFile(frame.fileName)) return null;
  if (typeof frame.lineNumber !== "number" || frame.lineNumber < 1) return null;

  const sourceContent = await getSourceContent(frame.fileName);
  if (!sourceContent) return null;

  const sourceLines = sourceContent.split("\n");
  const sliced = sliceSnippetWindow(sourceLines, frame.lineNumber);
  if (!sliced) return null;

  return {
    startLine: sliced.startLine,
    endLine: sliced.endLine,
    highlightLine: frame.lineNumber,
    lines: sliced.lines,
    isApproximate: !isSnippetTrustworthy(sliced.lines, options.componentName ?? null),
  };
};
