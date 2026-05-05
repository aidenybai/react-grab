import { normalizeFileName } from "bippy/source";

// Anchored to a path boundary (start of string, `/`, or `\`) so we don't
// accidentally match inside a longer identifier like `mynode_modules/`.
// Uses the global flag because callers iterate to find the *last* match
// (which collapses pnpm's `.pnpm/<pkg>@<ver>/node_modules/<pkg>/...`,
// Yarn PnP's `.zip/node_modules/<pkg>/...`, and Bun's
// `.bun/<pkg>@<ver>@@@1/node_modules/<pkg>/...` to the real package layer).
const NODE_MODULES_REGEX = /(?:^|[/\\])node_modules[/\\]/g;

// Vite's pre-bundled optimized deps live at `node_modules/.vite/deps/`, but
// while the dev server re-optimizes it temporarily writes to `deps_temp/`
// (or `deps_temp_<hash>/` on force re-optimize in Vite 5+). The trailing
// suffix is opaque to us, so the regex captures any `deps*` sibling.
const VITE_OPTIMIZED_DEPS_REGEX = /[/\\]\.vite[/\\]deps[^/\\]*[/\\]/g;

const FILE_EXTENSION_REGEX = /\.[mc]?[jt]sx?$/i;
const VITE_INTERNAL_CHUNK_REGEX = /^chunk-[A-Za-z0-9_-]+$/;
const PATH_SEPARATOR_REGEX = /[/\\]/;

// Captures the `<name>` from a `<name>@<version>` segment, where `<version>`
// starts with a digit (`react@19.0.0`, `lodash@4`) or `v<digit>` (skypack's
// pinned URLs like `lucide-react@v1.14.0-abcdef`). Strict enough to reject
// incidental `@` occurrences in user paths (`me@work`, `foo@bar.com`,
// twitter `@handle`) without needing a hardcoded allow-list of CDN hosts
// that would rot as new CDNs appear.
const NAME_AT_VERSION_REGEX = /^(.+)@v?\d/;

// Splits on `/` or `\` and drops empty segments, so paths with consecutive
// separators (e.g. `/proj//node_modules//lucide-react/...` from poorly
// concatenated bundler URLs) still produce a clean segment list.
const splitPathSegments = (path: string): string[] =>
  path.split(PATH_SEPARATOR_REGEX).filter(Boolean);

// Reads `<scope>?/<name>` from the path tail that follows a `node_modules`
// boundary, rejecting hoist meta-directories like `.pnpm`, `.vite`, `.bin`,
// `.cache` (whose real packages live one level deeper and are picked up
// either by the `.vite/deps/` recognizer or by the last-match collapse
// past the meta-directory to the inner `node_modules/`).
const readNodeModulesPackage = (afterMarker: string): string | null => {
  const [first, second] = splitPathSegments(afterMarker);
  if (!first || first.startsWith(".")) return null;
  if (!first.startsWith("@")) return first;
  return second ? `${first}/${second}` : null;
};

// Vite flattens scoped optimized deps because filenames cannot contain a
// slash: `@radix-ui/react-dialog` is written as `@radix-ui_react-dialog.js`.
// Internal split chunks are emitted as `chunk-<hash>.js` and have no
// recoverable package origin, so we drop them.
const readViteOptimizedDepPackage = (afterMarker: string): string | null => {
  const firstSegment = splitPathSegments(afterMarker)[0];
  if (!firstSegment) return null;
  const stem = firstSegment.replace(FILE_EXTENSION_REGEX, "");
  if (VITE_INTERNAL_CHUNK_REGEX.test(stem)) return null;
  if (!stem.startsWith("@")) return stem;
  const scopeBoundary = stem.indexOf("_");
  if (scopeBoundary === -1) return null;
  return `${stem.slice(0, scopeBoundary)}/${stem.slice(scopeBoundary + 1)}`;
};

const matchAfterLastPattern = (
  path: string,
  pattern: RegExp,
  read: (afterMarker: string) => string | null,
): string | null => {
  const lastMatch = [...path.matchAll(pattern)].at(-1);
  if (!lastMatch) return null;
  return read(path.slice((lastMatch.index ?? 0) + lastMatch[0].length));
};

const matchNameAtVersion = (segment: string | undefined): string | null =>
  segment?.match(NAME_AT_VERSION_REGEX)?.[1] ?? null;

// Walks a CDN URL pathname looking for the first segment shaped like
// `<name>@<version>` (with an optional preceding `@scope` segment).
// Tolerates path prefixes used by various CDNs: `/npm/`, `/v135/`,
// `/stable/`, `/pin/`, etc.
const findVersionedPackageInPath = (pathname: string): string | null => {
  const segments = splitPathSegments(pathname);
  for (const [index, segment] of segments.entries()) {
    if (segment.startsWith("@")) {
      const name = matchNameAtVersion(segments[index + 1]);
      if (name) return `${segment}/${name}`;
      continue;
    }
    const name = matchNameAtVersion(segment);
    if (name) return name;
  }
  return null;
};

const matchVersionedPackageInUrl = (rawFileName: string): string | null => {
  let url: URL;
  try {
    url = new URL(rawFileName);
  } catch {
    return null;
  }
  // file:// URLs have no hostname; their pathname is a real filesystem
  // path that should fall through to the node_modules matcher rather
  // than be treated as a CDN URL.
  if (!url.hostname) return null;
  return findVersionedPackageInPath(url.pathname);
};

// Recovers the npm package a stack frame originated from across the bundler
// matrix we care about (Vite, Webpack, Rollup, esbuild, Parcel, Turbopack,
// Next.js with source maps, plain Node, Yarn PnP, pnpm, Bun), plus a few
// common CDN URL shapes. Returns `null` whenever the path is ambiguous or
// clearly belongs to user source so callers can fall back to file-path-style
// output.
export const parsePackageName = (fileName: string | null | undefined): string | null => {
  if (!fileName) return null;

  const cdnPackage = matchVersionedPackageInUrl(fileName);
  if (cdnPackage) return cdnPackage;

  const normalized = normalizeFileName(fileName);
  if (!normalized) return null;

  return (
    matchAfterLastPattern(normalized, VITE_OPTIMIZED_DEPS_REGEX, readViteOptimizedDepPackage) ??
    matchAfterLastPattern(normalized, NODE_MODULES_REGEX, readNodeModulesPackage)
  );
};
