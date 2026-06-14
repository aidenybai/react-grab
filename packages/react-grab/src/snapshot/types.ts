export type SnapshotRasterMime = "png" | "jpg" | "jpeg" | "webp";
export type SnapshotBlobType = "svg" | SnapshotRasterMime;
export type SnapshotIconFontMatcher = string | RegExp;
export type SnapshotCachePolicy = "disabled" | "full" | "auto" | "soft";

export interface SnapshotLocalFont {
  family: string;
  src: string;
  weight?: string | number;
  style?: string;
}

export interface SnapshotExcludeFonts {
  families?: string[];
  domains?: string[];
  subsets?: string[];
}

export interface SnapshotPictureResolverOptions {
  timeout?: number;
  concurrency?: number;
  resolveLazySrc?: boolean;
  silent?: boolean;
}

export interface SnapshotOptions {
  debug?: boolean;
  fast?: boolean;
  scale?: number;
  dpr?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  quality?: number;
  format?: SnapshotBlobType;
  useProxy?: string;
  type?: SnapshotBlobType;
  exclude?: string[];
  excludeMode?: "hide" | "remove";
  filter?: (element: Element) => boolean;
  filterMode?: "hide" | "remove";
  outerTransforms?: boolean;
  outerShadows?: boolean;
  embedFonts?: boolean;
  localFonts?: SnapshotLocalFont[];
  iconFonts?: SnapshotIconFontMatcher | SnapshotIconFontMatcher[];
  excludeFonts?: SnapshotExcludeFonts;
  fallbackURL?: string | ((dimensions: { width?: number; height?: number }) => string);
  cache?: SnapshotCachePolicy;
  placeholders?: boolean;
  resolvePicturePlaceholders?: boolean;
  pictureResolver?: SnapshotPictureResolverOptions;
  safariWarmupAttempts?: number;
  plugins?: SnapshotPluginUse[];
}

export interface SnapshotExportInfo {
  type?: string;
  options?: SnapshotCaptureContext;
  url: string;
  exports?: Record<string, (options?: SnapshotCaptureContext) => Promise<unknown>>;
}

export interface SnapshotCaptureContext extends SnapshotOptions {
  element?: Element;
  clone?: HTMLElement | SVGElement | null;
  classCSS?: string;
  styleCache?: unknown;
  fontsCSS?: string;
  baseCSS?: string;
  svgString?: string;
  dataURL?: string;
  snap?: {
    toPng: (element: Element, options?: SnapshotOptions) => Promise<HTMLImageElement>;
    toSvg: (element: Element, options?: SnapshotOptions) => Promise<HTMLImageElement>;
  };
  export?: SnapshotExportInfo;
  [key: string]: unknown;
}

export type SnapshotExporter = (
  context: SnapshotCaptureContext,
  options?: SnapshotCaptureContext,
) => Promise<unknown>;

export type SnapshotExportMap = Record<string, SnapshotExporter>;

export interface SnapshotPlugin {
  name: string;
  beforeSnap?: (context: SnapshotCaptureContext) => void | Promise<void>;
  beforeClone?: (context: SnapshotCaptureContext) => void | Promise<void>;
  afterClone?: (context: SnapshotCaptureContext) => void | Promise<void>;
  beforeRender?: (context: SnapshotCaptureContext) => void | Promise<void>;
  afterRender?: (context: SnapshotCaptureContext) => void | Promise<void>;
  beforeExport?: (context: SnapshotCaptureContext) => void | Promise<void>;
  afterExport?: (context: SnapshotCaptureContext, result: unknown) => unknown | Promise<unknown>;
  defineExports?: (
    context: SnapshotCaptureContext,
  ) => SnapshotExportMap | Promise<SnapshotExportMap>;
  afterSnap?: (context: SnapshotCaptureContext) => void | Promise<void>;
}

export type SnapshotPluginFactory = (options?: unknown) => SnapshotPlugin;

export type SnapshotPluginUse =
  | SnapshotPlugin
  | SnapshotPluginFactory
  | [SnapshotPluginFactory, unknown]
  | { plugin: SnapshotPluginFactory; options?: unknown };

export interface SnapshotDownloadOptions {
  filename?: string;
  format?: SnapshotBlobType;
  type?: SnapshotBlobType;
  quality?: number;
  width?: number;
  height?: number;
}

export interface SnapshotBlobOptions {
  type?: SnapshotBlobType;
  quality?: number;
  width?: number;
  height?: number;
}

export interface SnapshotCaptureResult {
  url: string;
  toRaw: () => string;
  to: (type: string, options?: SnapshotCaptureContext) => Promise<unknown>;
  toImg: (options?: Partial<SnapshotOptions>) => Promise<HTMLImageElement>;
  toSvg: (options?: Partial<SnapshotOptions>) => Promise<HTMLImageElement>;
  toCanvas: (options?: Partial<SnapshotOptions>) => Promise<HTMLCanvasElement>;
  toBlob: (options?: SnapshotBlobOptions & Partial<SnapshotOptions>) => Promise<Blob>;
  toPng: (options?: Partial<SnapshotOptions>) => Promise<HTMLImageElement>;
  toJpg: (options?: Partial<SnapshotOptions>) => Promise<HTMLImageElement>;
  toWebp: (options?: Partial<SnapshotOptions>) => Promise<HTMLImageElement>;
  download: (options?: SnapshotDownloadOptions & Partial<SnapshotOptions>) => Promise<void>;
  [key: string]: unknown;
}

export interface SnapshotIconImageResult {
  dataUrl: string;
  width: number;
  height: number;
}

export interface SnapshotCounterContext {
  get: (node: Element, name: string) => number;
  getStack: (node: Element, name: string) => number[];
}

export interface SnapshotSessionCache {
  styleMap: Map<Element, string>;
  styleCache: WeakMap<Element, CSSStyleDeclaration>;
  nodeMap: Map<Element, Element>;
  options?: SnapshotCaptureContext;
  shadowScopeSeq?: number;
  __counterEpoch?: number;
  __counterCtx?: SnapshotCounterContext | null;
  __pseudoPreflight?: boolean;
  __pseudoPreflightFp?: string;
  __bumpedForDisabled?: boolean;
}

export interface SnapshotImageMeta {
  w0?: number;
  h0?: number;
}

export interface SnapshotPreCacheOptions {
  root?: Element | Document;
  embedFonts?: boolean;
  localFonts?: SnapshotLocalFont[];
  iconFonts?: SnapshotIconFontMatcher | SnapshotIconFontMatcher[];
  useProxy?: string;
  cache?: SnapshotCachePolicy;
  cacheOpt?: SnapshotCachePolicy;
  excludeFonts?: SnapshotExcludeFonts;
  fontStylesheetDomains?: string[];
  reset?: boolean;
}
