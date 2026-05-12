import { normalizeFileName } from "bippy/source";

const NODE_MODULES_PATTERN = /(?:^|[/\\])node_modules[/\\]/g;
const VITE_OPTIMIZED_DEPS_PATTERN = /[/\\]\.vite[/\\]deps[^/\\]*[/\\]/g;
const FILE_EXTENSION_PATTERN = /\.[mc]?[jt]sx?$/i;
const VITE_INTERNAL_CHUNK_PATTERN = /^chunk-[A-Za-z0-9_-]+$/;
const PATH_SEPARATOR_PATTERN = /[/\\]/;
const NAME_AT_VERSION_PATTERN = /^(.+?)@v?\d/;

const splitPathSegments = (path: string): string[] =>
  path.split(PATH_SEPARATOR_PATTERN).filter(Boolean);

const readNodeModulesPackage = (afterMarker: string): string | null => {
  const [first, second] = splitPathSegments(afterMarker);
  if (!first || first.startsWith(".")) return null;
  if (!first.startsWith("@")) return first;
  return second ? `${first}/${second}` : null;
};

// Vite flattens scoped packages because filenames cannot contain a slash:
// `@radix-ui/react-dialog` becomes `@radix-ui_react-dialog.js`.
// Ambiguity: if the scope itself contains an underscore (`@my_org/pkg` ->
// `@my_org_pkg.js`), indexOf("_") splits at the wrong boundary. This is
// inherent to Vite's encoding and unresolvable without a registry lookup.
const readViteOptimizedDepPackage = (afterMarker: string): string | null => {
  const firstSegment = splitPathSegments(afterMarker)[0];
  if (!firstSegment) return null;
  const stem = firstSegment.replace(FILE_EXTENSION_PATTERN, "");
  if (VITE_INTERNAL_CHUNK_PATTERN.test(stem)) return null;
  if (!stem.startsWith("@")) return stem;
  const scopeBoundary = stem.indexOf("_");
  if (scopeBoundary === -1) return null;
  return `${stem.slice(0, scopeBoundary)}/${stem.slice(scopeBoundary + 1)}`;
};

const extractAfterLastMarker = (
  input: string,
  pattern: RegExp,
  read: (afterMarker: string) => string | null,
): string | null => {
  let lastMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(input)) !== null) {
    lastMatch = match;
  }
  if (!lastMatch) return null;
  return read(input.slice(lastMatch.index + lastMatch[0].length));
};

const extractNameAtVersion = (segment: string | undefined): string | null =>
  segment?.match(NAME_AT_VERSION_PATTERN)?.[1] ?? null;

const extractVersionedPackageFromUrl = (rawFileName: string): string | null => {
  let url: URL;
  try {
    url = new URL(rawFileName);
  } catch {
    return null;
  }
  if (!url.hostname) return null;

  const segments = splitPathSegments(url.pathname);
  for (const [index, segment] of segments.entries()) {
    if (segment.startsWith("@")) {
      const name = extractNameAtVersion(segments[index + 1]);
      if (name) return `${segment}/${name}`;
      continue;
    }
    const name = extractNameAtVersion(segment);
    if (name) return name;
  }
  return null;
};

const extractFromLocalPath = (normalizedPath: string): string | null =>
  extractAfterLastMarker(normalizedPath, VITE_OPTIMIZED_DEPS_PATTERN, readViteOptimizedDepPackage) ??
  extractAfterLastMarker(normalizedPath, NODE_MODULES_PATTERN, readNodeModulesPackage);

export const parsePackageName = (fileName: string | null | undefined): string | null => {
  if (!fileName) return null;

  const cdnResult = extractVersionedPackageFromUrl(fileName);
  if (cdnResult) return cdnResult;

  const normalized = normalizeFileName(fileName);
  if (!normalized) return null;

  return extractFromLocalPath(normalized);
};
