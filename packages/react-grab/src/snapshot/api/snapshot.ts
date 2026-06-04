import { captureDOM } from "../core/capture.js";
import { extendIconFonts } from "../modules/icon-fonts.js";
import { createContext } from "../core/context.js";
import { isSafari } from "../utils/browser.js";
import { debugWarn } from "../utils/debug.js";
import { registerPlugins, runHook, runAll, attachSessionPlugins } from "../core/plugins.js";
import { collectUsedFontVariants, ensureFontsReady } from "../modules/fonts.js";
import { toImg, toSvg } from "../exporters/to-img.js";
import { toCanvas } from "../exporters/to-canvas.js";
import { toBlob } from "../exporters/to-blob.js";
import { rasterize } from "../modules/rasterize.js";
import { download } from "../exporters/download.js";
import type {
  SnapshotOptions,
  SnapshotCaptureContext,
  SnapshotCaptureResult,
  SnapshotExportMap,
  SnapshotPluginUse,
} from "../types.js";
export { preCache } from "./pre-cache.js";

interface SnapshotApi {
  (element: Element, options?: SnapshotOptions): Promise<SnapshotCaptureResult>;
  capture: (
    el: Element,
    context: SnapshotCaptureContext,
    token?: symbol,
  ) => Promise<SnapshotCaptureResult>;
  plugins: (...defs: SnapshotPluginUse[]) => SnapshotApi;
  toRaw: (el: Element, options?: SnapshotOptions) => Promise<string>;
  toImg: (el: Element, options?: SnapshotOptions) => Promise<HTMLImageElement>;
  toSvg: (el: Element, options?: SnapshotOptions) => Promise<HTMLImageElement>;
  toCanvas: (el: Element, options?: SnapshotOptions) => Promise<HTMLCanvasElement>;
  toBlob: (el: Element, options?: SnapshotOptions) => Promise<Blob>;
  toPng: (el: Element, options?: SnapshotOptions) => Promise<HTMLImageElement>;
  toJpg: (el: Element, options?: SnapshotOptions) => Promise<HTMLImageElement>;
  toWebp: (el: Element, options?: SnapshotOptions) => Promise<HTMLImageElement>;
  download: (el: Element, options?: SnapshotOptions) => Promise<void>;
}

const INTERNAL_TOKEN = Symbol("snapshot.internal");
const INTERNAL_EXPORT_TOKEN = Symbol("snapshot.internal.silent");

let _safariWarmup = false;

const main = async (
  element: Element,
  userOptions?: SnapshotOptions,
): Promise<SnapshotCaptureResult> => {
  if (!element) throw new Error("Element cannot be null or undefined");

  const context = createContext(userOptions);

  attachSessionPlugins(context, userOptions && userOptions.plugins);

  if (isSafari() && (context.embedFonts === true || hasBackgroundOrMask(element))) {
    if (context.embedFonts) {
      try {
        const required = collectUsedFontVariants(element);
        const families = new Set(
          [...required].map((k) => String(k).split("__")[0]).filter(Boolean),
        );
        await ensureFontsReady(families, 1);
      } catch {}
    }
    const attempts = context.safariWarmupAttempts ?? 3;
    for (let i = 0; i < attempts; i++) {
      try {
        await safariWarmup(element, userOptions);
      } catch {}
    }
  }

  if (Array.isArray(context.iconFonts) && context.iconFonts.length > 0) {
    extendIconFonts(context.iconFonts);
  }

  if (!context.snap) {
    context.snap = {
      toPng: (el, opts) => snapshot.toPng(el, opts),
      toSvg: (el, opts) => snapshot.toSvg(el, opts),
    };
  }

  return snapshot.capture(element, context, INTERNAL_TOKEN);
};

export const plugins = (...defs: SnapshotPluginUse[]): SnapshotApi => {
  registerPlugins(...defs);
  return snapshot;
};

export const snapshot: SnapshotApi = Object.assign(main, { plugins }) as SnapshotApi;

snapshot.capture = async (el, context, _token) => {
  if (_token !== INTERNAL_TOKEN) {
    throw new Error("[snapshot.capture] is internal. Use snapshot(...) instead.");
  }

  const url = await captureDOM(el, context);

  const coreExports: SnapshotExportMap = {
    img: async (ctx, opts) => toImg(url, { ...ctx, ...(opts || {}) }),
    svg: async (ctx, opts) => toSvg(url, { ...ctx, ...(opts || {}) }),
    canvas: async (ctx, opts) => toCanvas(url, { ...ctx, ...(opts || {}) }),
    blob: async (ctx, opts) => toBlob(url, { ...ctx, ...(opts || {}) }),
    png: async (ctx, opts) => rasterize(url, { ...ctx, ...(opts || {}), format: "png" }),
    jpeg: async (ctx, opts) => rasterize(url, { ...ctx, ...(opts || {}), format: "jpeg" }),
    webp: async (ctx, opts) => rasterize(url, { ...ctx, ...(opts || {}), format: "webp" }),
    download: async (ctx, opts) => download(url, { ...ctx, ...(opts || {}) }),
  };

  const pluginExports: Record<string, (opts?: SnapshotCaptureContext) => Promise<unknown>> = {};
  for (const exportKey of ["img", "svg", "canvas", "blob", "png", "jpeg", "webp"]) {
    pluginExports[exportKey] = async (opts) =>
      coreExports[exportKey](context, {
        ...(opts || {}),
        [INTERNAL_EXPORT_TOKEN]: true,
      } as SnapshotCaptureContext);
  }
  pluginExports.jpg = pluginExports.jpeg;

  const defineCtx: SnapshotCaptureContext = {
    ...context,
    export: { url },
    exports: pluginExports,
  };

  const providedMaps = await runAll("defineExports", defineCtx);
  const provided: SnapshotExportMap = Object.assign(
    {},
    ...providedMaps
      .filter((entry: unknown) => Boolean(entry) && typeof entry === "object")
      .reverse(),
  );

  const exportsMap: SnapshotExportMap = { ...coreExports, ...provided };

  if (exportsMap.jpeg && !exportsMap.jpg) {
    exportsMap.jpg = (ctx, opts) => exportsMap.jpeg(ctx, opts);
  }

  const normalizeExportOptions = (
    type: string,
    opts?: Partial<SnapshotOptions>,
  ): SnapshotCaptureContext => {
    const next: SnapshotCaptureContext = { ...context, ...(opts || {}) };
    const lossy = (s: string): boolean => s === "jpeg" || s === "jpg" || s === "webp";
    const fmt = [type, next.format, next.type]
      .map((v) => (typeof v === "string" ? v.toLowerCase() : ""))
      .find(lossy);
    if (fmt) {
      const noBg = next.backgroundColor == null || next.backgroundColor === "transparent";
      if (noBg) next.backgroundColor = "#ffffff";
    }
    return next;
  };

  let afterSnapFired = false;
  let exportQueue: Promise<unknown> = Promise.resolve();
  const runExport = <T = unknown>(type: string, opts?: Partial<SnapshotOptions>): Promise<T> => {
    const job = async (): Promise<T> => {
      const work = exportsMap[type];
      if (!work) throw new Error(`[snapshot] Unknown export type: ${type}`);
      const nextOpts = normalizeExportOptions(type, opts);
      const ctx: SnapshotCaptureContext = { ...context, export: { type, options: nextOpts, url } };
      await runHook("beforeExport", ctx);
      const result2 = await work(ctx, nextOpts);
      await runHook("afterExport", ctx, result2);
      if (!afterSnapFired) {
        afterSnapFired = true;
        await runHook("afterSnap", context);
      }
      return result2 as T;
    };
    exportQueue = exportQueue.then(job);
    return exportQueue as Promise<T>;
  };

  const result: SnapshotCaptureResult = {
    url,
    toRaw: () => url,
    to: (type, opts) => runExport(type, opts),
    toImg: (opts) => runExport<HTMLImageElement>("img", opts),
    toSvg: (opts) => runExport<HTMLImageElement>("svg", opts),
    toCanvas: (opts) => runExport<HTMLCanvasElement>("canvas", opts),
    toBlob: (opts) => runExport<Blob>("blob", opts),
    toPng: (opts) => runExport<HTMLImageElement>("png", opts),
    toJpg: (opts) => runExport<HTMLImageElement>("jpg", opts),
    toWebp: (opts) => runExport<HTMLImageElement>("webp", opts),
    download: (opts) => runExport<void>("download", opts),
  };

  for (const key of Object.keys(exportsMap)) {
    const helper = "to" + key.charAt(0).toUpperCase() + key.slice(1);
    if (!result[helper]) {
      result[helper] = (opts?: SnapshotCaptureContext) => runExport(key, opts);
    }
  }

  return result;
};

snapshot.toRaw = (el, options) => snapshot(el, options).then((result) => result.toRaw());

snapshot.toImg = (el, options) => snapshot(el, options).then((result) => result.toImg());
snapshot.toSvg = (el, options) => snapshot(el, options).then((result) => result.toSvg());

snapshot.toCanvas = (el, options) => snapshot(el, options).then((result) => result.toCanvas());

snapshot.toBlob = (el, options) => snapshot(el, options).then((result) => result.toBlob());

snapshot.toPng = (el, options) =>
  snapshot(el, { ...options, format: "png" }).then((result) => result.toPng());

snapshot.toJpg = (el, options) =>
  snapshot(el, { ...options, format: "jpeg" }).then((result) => result.toJpg());

snapshot.toWebp = (el, options) =>
  snapshot(el, { ...options, format: "webp" }).then((result) => result.toWebp());

snapshot.download = (el, options) => snapshot(el, options).then((result) => result.download());

const safariWarmup = async (element: Element, baseOptions?: SnapshotOptions): Promise<void> => {
  if (_safariWarmup) return;

  const preflight = {
    ...baseOptions,
    fast: true,
    embedFonts: true,
    scale: 0.2,
  };

  let url: string | undefined;
  try {
    url = await captureDOM(element, preflight);
  } catch (error) {
    debugWarn(baseOptions, "safariWarmup pre-capture failed", error);
  }

  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

  if (url) {
    const readyUrl = url;
    await new Promise<void>((resolve) => {
      const img = new Image();
      try {
        img.decoding = "sync";
        img.loading = "eager";
      } catch (error) {
        debugWarn(baseOptions, "safariWarmup img hints failed", error);
      }
      img.style.cssText =
        "position:fixed;left:0px;top:0px;width:10px;height:10px;opacity:0.01;pointer-events:none;";
      img.src = readyUrl;
      document.body.appendChild(img);

      void (async () => {
        try {
          if (typeof img.decode === "function") await img.decode();
        } catch (error) {
          debugWarn(baseOptions, "safariWarmup img.decode failed", error);
        }
        const start = performance.now();
        while (!(img.complete && img.naturalWidth > 0) && performance.now() - start < 900) {
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
        }
        await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
        try {
          const c = document.createElement("canvas");
          c.width = Math.max(1, img.naturalWidth || 10);
          c.height = Math.max(1, img.naturalHeight || 10);
          const ctx = c.getContext("2d");
          if (ctx) ctx.drawImage(img, 0, 0);
        } catch {}
        await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
        try {
          img.remove();
        } catch (error) {
          debugWarn(baseOptions, "safariWarmup img.remove failed", error);
        }
        resolve();
      })();
    });
  }

  element.querySelectorAll("canvas").forEach((c) => {
    try {
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.getImageData(0, 0, 1, 1);
      }
    } catch (error) {
      debugWarn(baseOptions, "safariWarmup canvas poke failed", error);
    }
  });

  _safariWarmup = true;
};

const hasBackgroundOrMask = (el: Element): boolean => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Element;
    const cs = getComputedStyle(node);

    const bg = cs.backgroundImage && cs.backgroundImage !== "none";
    const styleWithWebkit = cs as CSSStyleDeclaration & { webkitMaskImage?: string };
    const mask =
      (cs.maskImage && cs.maskImage !== "none") ||
      (styleWithWebkit.webkitMaskImage && styleWithWebkit.webkitMaskImage !== "none");

    if (bg || mask) return true;
    if (node.tagName === "CANVAS") return true;
  }
  return false;
};
