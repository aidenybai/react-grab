import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Framework, NextRouterType } from "./detect.js";

const REACT_GRAB_FUZZY_PATTERNS: readonly RegExp[] = [
  /["'`][^"'`]*react-grab/,
  /react-grab[^"'`]*["'`]/,
  /<[^>]*react-grab/i,
  /import[^;]*react-grab/i,
  /require[^)]*react-grab/i,
  /from\s+[^;]*react-grab/i,
  /src[^>]*react-grab/i,
  /href[^>]*react-grab/i,
];

/**
 * Fuzzy heuristic for detecting React Grab usage in a source file. Matches
 * imports, `require()`s, JSX attributes, and `<script src>` style references.
 *
 * This is intentionally lenient: better to detect a near-match and skip a
 * re-install than to install a duplicate.
 */
export const hasReactGrabCode = (content: string): boolean =>
  REACT_GRAB_FUZZY_PATTERNS.some((pattern) => pattern.test(content));

export const hasReactGrabCodeInFile = (filePath: string): boolean => {
  if (!existsSync(filePath)) return false;
  try {
    return hasReactGrabCode(readFileSync(filePath, "utf-8"));
  } catch {
    return false;
  }
};

const firstExistingPath = (
  projectRoot: string,
  candidates: readonly (readonly string[])[],
): string | null => {
  for (const segments of candidates) {
    const filePath = join(projectRoot, ...segments);
    if (existsSync(filePath)) return filePath;
  }
  return null;
};

const NEXT_APP_LAYOUT_CANDIDATES: readonly (readonly string[])[] = [
  ["app", "layout.tsx"],
  ["app", "layout.jsx"],
  ["src", "app", "layout.tsx"],
  ["src", "app", "layout.jsx"],
];

const NEXT_PAGES_DOCUMENT_CANDIDATES: readonly (readonly string[])[] = [
  ["pages", "_document.tsx"],
  ["pages", "_document.jsx"],
  ["src", "pages", "_document.tsx"],
  ["src", "pages", "_document.jsx"],
];

const NEXT_INSTRUMENTATION_CANDIDATES: readonly (readonly string[])[] = [
  ["instrumentation-client.ts"],
  ["instrumentation-client.js"],
  ["src", "instrumentation-client.ts"],
  ["src", "instrumentation-client.js"],
];

const VITE_INDEX_HTML_CANDIDATES: readonly (readonly string[])[] = [
  ["index.html"],
  ["public", "index.html"],
];

const VITE_ENTRY_CANDIDATES: readonly (readonly string[])[] = [
  ["src", "index.tsx"],
  ["src", "index.jsx"],
  ["src", "index.ts"],
  ["src", "index.js"],
  ["src", "main.tsx"],
  ["src", "main.jsx"],
  ["src", "main.ts"],
  ["src", "main.js"],
];

const TANSTACK_ROOT_CANDIDATES: readonly (readonly string[])[] = [
  ["src", "routes", "__root.tsx"],
  ["src", "routes", "__root.jsx"],
  ["app", "routes", "__root.tsx"],
  ["app", "routes", "__root.jsx"],
];

export const findLayoutFile = (projectRoot: string): string | null =>
  firstExistingPath(projectRoot, NEXT_APP_LAYOUT_CANDIDATES);

export const findDocumentFile = (projectRoot: string): string | null =>
  firstExistingPath(projectRoot, NEXT_PAGES_DOCUMENT_CANDIDATES);

export const findInstrumentationFile = (projectRoot: string): string | null =>
  firstExistingPath(projectRoot, NEXT_INSTRUMENTATION_CANDIDATES);

export const findIndexHtml = (projectRoot: string): string | null =>
  firstExistingPath(projectRoot, VITE_INDEX_HTML_CANDIDATES);

export const findEntryFile = (projectRoot: string): string | null =>
  firstExistingPath(projectRoot, VITE_ENTRY_CANDIDATES);

export const findTanStackRootFile = (projectRoot: string): string | null =>
  firstExistingPath(projectRoot, TANSTACK_ROOT_CANDIDATES);

/**
 * The primary file that hosts React Grab for a given framework. For Vite, the
 * entry file is returned even when an `index.html` also exists; `previewTransform`
 * inserts the import-with-dev-guard into the entry file, while CDN/option
 * updates may target `index.html` separately.
 */
export const findFrameworkEntry = (
  projectRoot: string,
  framework: Framework,
  nextRouterType: NextRouterType,
): string | null => {
  switch (framework) {
    case "next":
      return nextRouterType === "app"
        ? findLayoutFile(projectRoot)
        : findDocumentFile(projectRoot);
    case "vite":
      return findEntryFile(projectRoot);
    case "tanstack":
      return findTanStackRootFile(projectRoot);
    case "webpack":
      return findEntryFile(projectRoot);
    default:
      return null;
  }
};

/**
 * The full set of files that might contain a React Grab installation for a
 * given project (entry + index.html + instrumentation-client variants).
 * Used by detect to answer "is React Grab installed anywhere".
 */
export const REACT_GRAB_DETECTION_PATHS: readonly (readonly string[])[] = [
  ...NEXT_APP_LAYOUT_CANDIDATES,
  ...NEXT_PAGES_DOCUMENT_CANDIDATES,
  ...NEXT_INSTRUMENTATION_CANDIDATES,
  ...VITE_INDEX_HTML_CANDIDATES,
  ["src", "index.tsx"],
  ["src", "index.ts"],
  ["src", "main.tsx"],
  ["src", "main.ts"],
  ...TANSTACK_ROOT_CANDIDATES,
];
