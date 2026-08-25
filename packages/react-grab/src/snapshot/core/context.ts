import { normalizeCachePolicy } from "./cache.js";
import type { SnapshotCaptureContext, SnapshotOptions, SnapshotCachePolicy } from "../types.js";

export const createContext = (
  options: SnapshotOptions | undefined = {},
): SnapshotCaptureContext => {
  const opts = options as SnapshotOptions & {
    fontStylesheetDomains?: string[];
    excludeStyleProps?: RegExp | ((prop: string) => boolean) | null;
    filename?: string;
  };

  let resolvedFormat = opts.format ?? "png";
  if (resolvedFormat === "jpg") resolvedFormat = "jpeg";
  const cachePolicy: SnapshotCachePolicy = normalizeCachePolicy(opts.cache);

  return {
    debug: opts.debug ?? false,
    fast: opts.fast ?? true,
    scale: opts.scale ?? 1,

    exclude: opts.exclude ?? [],
    excludeMode: opts.excludeMode ?? "hide",
    filter: (opts.filter ?? null) as SnapshotOptions["filter"],
    filterMode: opts.filterMode ?? "hide",

    placeholders: opts.placeholders !== false,

    embedFonts: opts.embedFonts ?? false,
    iconFonts: Array.isArray(opts.iconFonts)
      ? opts.iconFonts
      : opts.iconFonts
        ? [opts.iconFonts]
        : [],
    localFonts: Array.isArray(opts.localFonts) ? opts.localFonts : [],
    excludeFonts: opts.excludeFonts ?? undefined,
    fontStylesheetDomains: Array.isArray(opts.fontStylesheetDomains)
      ? opts.fontStylesheetDomains
      : [],
    fallbackURL: opts.fallbackURL ?? undefined,

    cache: cachePolicy,

    useProxy: typeof opts.useProxy === "string" ? opts.useProxy : "",

    width: (opts.width ?? null) as SnapshotOptions["width"],
    height: (opts.height ?? null) as SnapshotOptions["height"],
    format: resolvedFormat,
    type: opts.type ?? "svg",
    quality: opts.quality ?? 0.92,
    dpr: opts.dpr ?? (window.devicePixelRatio || 1),
    backgroundColor: (opts.backgroundColor ??
      (["jpeg", "webp"].includes(resolvedFormat)
        ? "#ffffff"
        : null)) as SnapshotOptions["backgroundColor"],
    filename: opts.filename ?? "snapshot",

    outerTransforms: opts.outerTransforms ?? true,
    outerShadows: opts.outerShadows ?? false,

    safariWarmupAttempts: Math.min(3, Math.max(1, (opts.safariWarmupAttempts ?? 3) | 0)),

    excludeStyleProps: opts.excludeStyleProps ?? null,

    resolvePicturePlaceholders: opts.resolvePicturePlaceholders !== false,
    pictureResolver:
      opts.pictureResolver && typeof opts.pictureResolver === "object" ? opts.pictureResolver : {},
  };
};
