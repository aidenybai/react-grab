import { isSourceFile } from "bippy/source";
import { normalizeFilePath } from "./normalize-file-path.js";
import { resolvePackageName } from "./parse-package-name.js";

// design-system wrappers (e.g. shadcn's components/ui) are rarely the file a
// user wants to edit, so grabs resolve to the consuming app source instead.
const DEFAULT_IGNORED_SOURCE_PATHS: readonly string[] = ["components/ui"];
const PATH_SEPARATOR_PATTERN = /[/\\]/;
// Keyed by fileName; classification depends solely on fileName.
const defaultClassificationCache = new Map<string, SourcePathClassification>();

export interface SourcePathClassification {
  kind: "app-source" | "ignored-app-source" | "package-source" | "unknown";
  packageName: string | null;
}

const splitPathSegments = (path: string): string[] =>
  normalizeFilePath(path).split(PATH_SEPARATOR_PATTERN).filter(Boolean);

const DEFAULT_IGNORED_SOURCE_PATH_SEGMENTS = DEFAULT_IGNORED_SOURCE_PATHS.map((sourcePath) =>
  splitPathSegments(sourcePath),
);

const matchesPathSegments = (pathSegments: string[], patternSegments: string[]): boolean => {
  if (patternSegments.length === 0 || patternSegments.length > pathSegments.length) return false;

  for (let pathIndex = 0; pathIndex <= pathSegments.length - patternSegments.length; pathIndex++) {
    let didMatch = true;
    for (let patternIndex = 0; patternIndex < patternSegments.length; patternIndex++) {
      if (pathSegments[pathIndex + patternIndex] !== patternSegments[patternIndex]) {
        didMatch = false;
        break;
      }
    }
    if (didMatch) return true;
  }

  return false;
};

const matchesIgnoredSourcePath = (fileName: string): boolean => {
  const pathSegments = splitPathSegments(fileName);

  for (const ignoredSourcePathSegments of DEFAULT_IGNORED_SOURCE_PATH_SEGMENTS) {
    if (matchesPathSegments(pathSegments, ignoredSourcePathSegments)) return true;
  }

  return false;
};

export const classifySourcePath = (
  fileName: string | null | undefined,
): SourcePathClassification => {
  if (!fileName) return { kind: "unknown", packageName: null };

  const cachedClassification = defaultClassificationCache.get(fileName);
  if (cachedClassification) return cachedClassification;

  const classification = classifySourcePathUncached(fileName);
  defaultClassificationCache.set(fileName, classification);
  return classification;
};

const classifySourcePathUncached = (fileName: string): SourcePathClassification => {
  const packageName = resolvePackageName(fileName);
  if (packageName) {
    return { kind: "package-source", packageName };
  }

  if (!isSourceFile(fileName)) {
    return { kind: "unknown", packageName: null };
  }

  if (matchesIgnoredSourcePath(fileName)) {
    return { kind: "ignored-app-source", packageName: null };
  }

  return { kind: "app-source", packageName: null };
};
