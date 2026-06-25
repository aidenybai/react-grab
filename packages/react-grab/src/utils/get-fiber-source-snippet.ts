import { getOwnerStack, getSourceFromSourceMap, getSourceMap, type SourceMap } from "bippy/source";
import type { Fiber } from "bippy";
import { SOURCE_SNIPPET_MAX_LINES } from "../constants.js";

const getSourcesContentFor = (sourceMap: SourceMap, fileName: string): string | null => {
  const directIndex = sourceMap.sources.indexOf(fileName);
  if (directIndex !== -1 && sourceMap.sourcesContent?.[directIndex]) {
    return sourceMap.sourcesContent[directIndex];
  }
  if (sourceMap.sections) {
    for (const section of sourceMap.sections) {
      const sectionIndex = section.map.sources.indexOf(fileName);
      if (sectionIndex !== -1 && section.map.sourcesContent?.[sectionIndex]) {
        return section.map.sourcesContent[sectionIndex];
      }
    }
  }
  return null;
};

// Resolves the original JSX text around where `fiber` is created, starting at its
// owner-stack call site. Returns the opening-tag region (a handful of lines, so a
// multi-line tag is captured) or null when the location can't be mapped back to
// original source - which is common: bundlers that ship inline source maps, or
// owner stacks that only carry component names, leave nothing to read, and the
// caller treats a null snippet as "can't verify" and keeps surfacing the key.
// Source-map fetches go through bippy's cache, which the leading source
// resolution has usually already warmed, so this rarely adds a request.
export const getFiberSourceSnippet = async (
  fiber: Fiber,
  fetchFn: (url: string) => Promise<Response>,
): Promise<string | null> => {
  try {
    const frames = await getOwnerStack(fiber, true, fetchFn);
    const callSite = frames.find(
      (frame) =>
        frame.fileName &&
        typeof frame.lineNumber === "number" &&
        typeof frame.columnNumber === "number",
    );
    if (!callSite?.fileName) return null;

    const sourceMap = await getSourceMap(callSite.fileName, true, fetchFn);
    if (!sourceMap) return null;

    const original = getSourceFromSourceMap(
      sourceMap,
      callSite.lineNumber as number,
      callSite.columnNumber as number,
    );
    if (!original?.fileName || !original.lineNumber) return null;

    const content = getSourcesContentFor(sourceMap, original.fileName);
    if (!content) return null;

    const lines = content.split("\n");
    const startLineIndex = original.lineNumber - 1;
    if (startLineIndex < 0 || startLineIndex >= lines.length) return null;

    const snippetLines = lines.slice(startLineIndex, startLineIndex + SOURCE_SNIPPET_MAX_LINES);
    const startColumn = Math.max(0, (original.columnNumber ?? 1) - 1);
    snippetLines[0] = snippetLines[0].slice(startColumn);
    return snippetLines.join("\n");
  } catch {
    return null;
  }
};
