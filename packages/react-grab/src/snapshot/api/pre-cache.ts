import {
  getStyle,
  inlineSingleBackgroundEntry,
  precacheCommonTags,
  isSafari,
} from "../utils/index.js";
import {
  embedCustomFonts,
  collectUsedFontVariants,
  collectUsedCodepoints,
  ensureFontsReady,
} from "../modules/fonts.js";
import { snapFetch } from "../modules/snap-fetch.js";
import { cache, applyCachePolicy, EvictingMap } from "../core/cache.js";
import { inlineBackgroundImages } from "../modules/background.js";
import type { SnapshotPreCacheOptions } from "../types.js";

export const preCache = async (
  root: Element | Document = document,
  options: SnapshotPreCacheOptions = {},
): Promise<void> => {
  const { embedFonts = true, useProxy = "" } = options;
  const cacheMode = options.cache ?? options.cacheOpt ?? "full";

  applyCachePolicy(cacheMode);

  const rootElement: Element = root instanceof Document ? root.documentElement : root;

  try {
    await document.fonts?.ready;
  } catch {}

  try {
    precacheCommonTags();
  } catch {}

  cache.session = cache.session || {};
  if (!cache.session.styleCache) {
    cache.session.styleCache = new WeakMap();
  }
  cache.image = cache.image || new EvictingMap(100);
  cache.background = cache.background || new EvictingMap(100);

  try {
    await inlineBackgroundImages(rootElement as HTMLElement, undefined, cache.session.styleCache, {
      useProxy,
    });
  } catch {}

  let imgEls: HTMLImageElement[] = [];
  let allEls: Element[] = [];
  try {
    if (root && root.nodeType === 1) {
      const rootElement = root as Element;
      const descendants = rootElement.querySelectorAll
        ? Array.from(rootElement.querySelectorAll("*"))
        : [];
      allEls = [rootElement, ...descendants];
      imgEls = [];
      if (rootElement.tagName === "IMG" && rootElement.getAttribute("src")) {
        imgEls.push(rootElement as HTMLImageElement);
      }
      imgEls.push(...Array.from(rootElement.querySelectorAll<HTMLImageElement>("img[src]")));
    } else if (root && root.querySelectorAll) {
      imgEls = Array.from(root.querySelectorAll<HTMLImageElement>("img[src]"));
      allEls = Array.from(root.querySelectorAll("*"));
    }
  } catch {}

  const promises: Promise<unknown>[] = [];

  for (const img of imgEls) {
    const src = img?.currentSrc || img?.src;
    if (!src) continue;
    if (!cache.image.has(src)) {
      const p = Promise.resolve()
        .then(async () => {
          const res = await snapFetch(src, { as: "dataURL", useProxy });
          if (res?.ok && typeof res.data === "string") {
            cache.image.set(src, res.data);
          }
        })
        .catch(() => {});
      promises.push(p);
    }
  }

  for (const el of allEls) {
    let bg = "";
    try {
      bg = (el as HTMLElement).style?.backgroundImage || "";
      if (!bg || bg === "none") {
        bg = getStyle(el).backgroundImage;
      }
    } catch {}
    if (bg && bg !== "none") {
      const urlEntries = bg.match(/url\((?:[^()"']+|"(?:[^"]*)"|'(?:[^']*)')\)/gi) || [];
      for (const entry of urlEntries) {
        const p = Promise.resolve()
          .then(() => inlineSingleBackgroundEntry(entry, { ...options, useProxy }))
          .catch(() => {});
        promises.push(p);
      }
    }
  }

  if (embedFonts) {
    try {
      const required = collectUsedFontVariants(rootElement);
      const usedCodepoints = collectUsedCodepoints(rootElement);

      const safari = typeof isSafari === "function" ? isSafari() : Boolean(isSafari);
      if (safari) {
        const families = new Set(
          Array.from(required)
            .map((k) => String(k).split("__")[0])
            .filter(Boolean),
        );
        await ensureFontsReady(families, 3);
      }

      await embedCustomFonts({
        required,
        usedCodepoints,
        exclude: options.excludeFonts,
        localFonts: options.localFonts,
        useProxy: options.useProxy ?? useProxy,
        fontStylesheetDomains: options.fontStylesheetDomains,
      });
    } catch {}
  }

  await Promise.allSettled(promises);
};
