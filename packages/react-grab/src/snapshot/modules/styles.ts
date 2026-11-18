import { getStyleKey, shouldIgnoreProp, getStyle } from "../utils/index.js";
import { cache } from "../core/cache.js";
import type { SnapshotCaptureContext, SnapshotCachePolicy } from "../types.js";

interface SnapshotCacheEntry {
  epoch: number;
  snapshot: Record<string, string>;
  embedFonts: boolean;
  excludeStyleProps: unknown;
}

interface SnapshotStylePersist {
  snapshotKeyCache: Map<string, string>;
  defaultStyle: typeof cache.defaultStyle;
  baseStyle: typeof cache.baseStyle;
  image: typeof cache.image;
  resource: typeof cache.resource;
  background: typeof cache.background;
  font: typeof cache.font;
}

interface SnapshotStyleContext {
  session: typeof cache.session;
  persist: SnapshotStylePersist;
  options: SnapshotCaptureContext;
}

const snapshotCache = new WeakMap<Element, SnapshotCacheEntry>();
const snapshotKeyCache = new Map<string, string>();
const MAX_SNAPSHOT_KEY_CACHE = 2000;
let __epoch = 0;
const bumpEpoch = (): void => {
  __epoch++;
  if (snapshotKeyCache.size > MAX_SNAPSHOT_KEY_CACHE) snapshotKeyCache.clear();
};

let __wired = false;
const setupInvalidationOnce = (root: Element = document.documentElement): void => {
  if (__wired) return;
  __wired = true;
  try {
    const domObs = new MutationObserver(() => bumpEpoch());
    domObs.observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
  } catch {}
  try {
    const headObs = new MutationObserver(() => bumpEpoch());
    headObs.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
  } catch {}
  try {
    const f = document.fonts;
    if (f) {
      f.addEventListener?.("loadingdone", bumpEpoch);
      f.ready?.then(() => bumpEpoch()).catch(() => {});
    }
  } catch {}
};

const snapshotComputedStyleFull = (
  style: CSSStyleDeclaration,
  options: SnapshotCaptureContext = {},
): Record<string, string> => {
  const out: Record<string, string> = {};
  const vis = style.getPropertyValue("visibility");
  const excludeStyleProps = options.excludeStyleProps;
  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    if (shouldIgnoreProp(prop)) continue;
    if (excludeStyleProps) {
      if (excludeStyleProps instanceof RegExp && excludeStyleProps.test(prop)) continue;
      if (typeof excludeStyleProps === "function" && excludeStyleProps(prop)) continue;
    }
    let val = style.getPropertyValue(prop);
    if (
      (prop === "background-image" || prop === "content") &&
      val.includes("url(") &&
      !val.includes("data:")
    ) {
      val = "none";
    }
    out[prop] = val;
  }
  const EXTRA_TEXT_DECORATION_PROPS = [
    "text-decoration-line",
    "text-decoration-color",
    "text-decoration-style",
    "text-decoration-thickness",
    "text-underline-offset",
    "text-decoration-skip-ink",
  ];
  for (const prop of EXTRA_TEXT_DECORATION_PROPS) {
    if (out[prop]) continue;
    try {
      const v = style.getPropertyValue(prop);
      if (v) out[prop] = v;
    } catch {}
  }
  const TEXT_STROKE_PROPS = [
    "-webkit-text-stroke",
    "-webkit-text-stroke-width",
    "-webkit-text-stroke-color",
    "paint-order",
  ];
  for (const prop of TEXT_STROKE_PROPS) {
    if (out[prop]) continue;
    try {
      const v = style.getPropertyValue(prop);
      if (v) out[prop] = v;
    } catch {}
  }
  if (options.embedFonts) {
    const EXTRA_FONT_PROPS = [
      "font-feature-settings",
      "font-variation-settings",
      "font-kerning",
      "font-variant",
      "font-variant-ligatures",
      "font-optical-sizing",
    ];
    for (const prop of EXTRA_FONT_PROPS) {
      if (out[prop]) continue;
      try {
        const v = style.getPropertyValue(prop);
        if (v) out[prop] = v;
      } catch {}
    }
  }
  if (vis === "hidden") out.opacity = "0";
  try {
    const cv = out["content-visibility"] || style.getPropertyValue("content-visibility");
    if (cv === "hidden") out["visibility"] = "hidden";
  } catch {}

  const bt = parseFloat(style.getPropertyValue("border-top-width") || "0") || 0;
  const br = parseFloat(style.getPropertyValue("border-right-width") || "0") || 0;
  const bb = parseFloat(style.getPropertyValue("border-bottom-width") || "0") || 0;
  const bl = parseFloat(style.getPropertyValue("border-left-width") || "0") || 0;
  if (bt === 0 && br === 0 && bb === 0 && bl === 0) {
    const bis = (style.getPropertyValue("border-image-source") || "").trim();
    const hasBorderImage = bis && bis !== "none";
    const BORDER_PROPS = [
      "border",
      "border-top",
      "border-right",
      "border-bottom",
      "border-left",
      "border-width",
      "border-style",
      "border-color",
      "border-top-width",
      "border-top-style",
      "border-top-color",
      "border-right-width",
      "border-right-style",
      "border-right-color",
      "border-bottom-width",
      "border-bottom-style",
      "border-bottom-color",
      "border-left-width",
      "border-left-style",
      "border-left-color",
      "border-block",
      "border-block-width",
      "border-block-style",
      "border-block-color",
      "border-inline",
      "border-inline-width",
      "border-inline-style",
      "border-inline-color",
    ];
    for (const p of BORDER_PROPS) delete out[p];
    if (!hasBorderImage) out["border"] = "none";
  }

  return out;
};
const __snapshotSig = new WeakMap<Record<string, string>, string>();
const styleSignature = (snap: Record<string, string>): string => {
  let sig = __snapshotSig.get(snap);
  if (sig) return sig;
  const entries = Object.entries(snap).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  sig = entries.map(([k, v]) => `${k}:${v}`).join(";");
  __snapshotSig.set(snap, sig);
  return sig;
};
const getSnapshot = (
  el: Element,
  preStyle: CSSStyleDeclaration | null = null,
  options: SnapshotCaptureContext = {},
): Record<string, string> => {
  const rec = snapshotCache.get(el);
  const ef = Boolean(options && options.embedFonts);
  const ex = (options && options.excludeStyleProps) || null;
  if (rec && rec.epoch === __epoch && rec.embedFonts === ef && rec.excludeStyleProps === ex)
    return rec.snapshot;
  const style = preStyle || getComputedStyle(el);
  const snap = snapshotComputedStyleFull(style, options);
  stripHeightForWrappers(el, style, snap);
  snapshotCache.set(el, { epoch: __epoch, snapshot: snap, embedFonts: ef, excludeStyleProps: ex });
  return snap;
};

const _resolveCtx = (
  sessionOrCtx: unknown,
  opts?: SnapshotCaptureContext,
): SnapshotStyleContext => {
  const probe = sessionOrCtx as
    | {
        session?: unknown;
        persist?: unknown;
        styleMap?: unknown;
        styleCache?: unknown;
        nodeMap?: unknown;
      }
    | null
    | undefined;

  if (probe && probe.session && probe.persist) return sessionOrCtx as SnapshotStyleContext;
  if (probe && (probe.styleMap || probe.styleCache || probe.nodeMap)) {
    return {
      session: sessionOrCtx as typeof cache.session,
      persist: {
        snapshotKeyCache,
        defaultStyle: cache.defaultStyle,
        baseStyle: cache.baseStyle,
        image: cache.image,
        resource: cache.resource,
        background: cache.background,
        font: cache.font,
      },
      options: opts || {},
    };
  }

  return {
    session: cache.session,
    persist: {
      snapshotKeyCache,
      defaultStyle: cache.defaultStyle,
      baseStyle: cache.baseStyle,
      image: cache.image,
      resource: cache.resource,
      background: cache.background,
      font: cache.font,
    },
    options: (sessionOrCtx as SnapshotCaptureContext) || opts || {},
  };
};

const normalizeInlineStyleToComputed = (
  source: Element,
  clone: Element,
  computed: CSSStyleDeclaration,
): void => {
  const sourceStyle = (source as HTMLElement).style;
  if (!sourceStyle || sourceStyle.length === 0) return;
  for (let i = 0; i < sourceStyle.length; i++) {
    const prop = sourceStyle[i];
    const val = computed.getPropertyValue(prop);
    if (val) (clone as HTMLElement).style.setProperty(prop, val);
  }
};

export const inlineAllStyles = async (
  source: Element,
  clone: Element,
  sessionOrCtx: unknown,
  opts?: SnapshotCaptureContext,
): Promise<void> => {
  if (source.tagName === "STYLE") return;

  const ctx = _resolveCtx(sessionOrCtx, opts);
  const resetMode: SnapshotCachePolicy | "auto" = (ctx.options && ctx.options.cache) || "auto";

  if (resetMode !== "disabled") setupInvalidationOnce(document.documentElement);

  if (resetMode === "disabled" && !ctx.session.__bumpedForDisabled) {
    bumpEpoch();
    snapshotKeyCache.clear();
    ctx.session.__bumpedForDisabled = true;
  }

  const { session, persist } = ctx;

  if (!session.styleCache.has(source)) {
    let computed: CSSStyleDeclaration | null = null;
    try {
      computed = getComputedStyle(source);
    } catch {}
    session.styleCache.set(source, computed || getComputedStyle(document.documentElement));
  }
  const pre = session.styleCache.get(source) as CSSStyleDeclaration;

  if (source.getAttribute?.("style")) {
    normalizeInlineStyleToComputed(source, clone, pre);
  }

  const snap = getSnapshot(source, pre, ctx.options);

  if (isFlexOrGridItem(source)) {
    const mw = pre.getPropertyValue("min-width");
    if (!mw || mw === "auto" || mw === "0px") {
      snap["min-width"] = "0px";
    }
  }

  const sig = styleSignature(snap);
  let key = persist.snapshotKeyCache.get(sig);
  if (!key) {
    const tag = source.tagName?.toLowerCase() || "div";
    key = getStyleKey(snap, tag);
    persist.snapshotKeyCache.set(sig, key);
  }
  session.styleMap.set(clone, key);
};

const isReplaced = (el: Element): boolean => {
  return (
    el instanceof HTMLImageElement ||
    el instanceof HTMLCanvasElement ||
    el instanceof HTMLVideoElement ||
    el instanceof HTMLIFrameElement ||
    el instanceof SVGElement ||
    el instanceof HTMLObjectElement ||
    el instanceof HTMLEmbedElement
  );
};

const hasBox = (cs: CSSStyleDeclaration): boolean => {
  if (cs.backgroundImage && cs.backgroundImage !== "none") return true;
  if (
    cs.backgroundColor &&
    cs.backgroundColor !== "rgba(0, 0, 0, 0)" &&
    cs.backgroundColor !== "transparent"
  )
    return true;
  if ((parseFloat(cs.borderTopWidth) || 0) > 0) return true;
  if ((parseFloat(cs.borderBottomWidth) || 0) > 0) return true;
  if ((parseFloat(cs.paddingTop) || 0) > 0) return true;
  if ((parseFloat(cs.paddingBottom) || 0) > 0) return true;
  const overflowBlock = (cs as CSSStyleDeclaration & { overflowBlock?: string }).overflowBlock;
  const ob = overflowBlock || cs.overflowY || "visible";
  return ob !== "visible";
};

const isFlexOrGridItem = (el: Element): boolean => {
  const p = el.parentElement;
  if (!p) return false;
  const pd = getStyle(p).display || "";
  return pd.includes("flex") || pd.includes("grid");
};

const hasFlowFast = (el: Element, cs: CSSStyleDeclaration): boolean => {
  if (el.textContent && /\S/.test(el.textContent)) return true;
  const f = el.firstElementChild,
    l = el.lastElementChild;
  if ((f && f.tagName === "BR") || (l && l.tagName === "BR")) return true;

  const sh = el.scrollHeight;
  if (sh === 0) return false;
  const pt = parseFloat(cs.paddingTop) || 0;
  const pb = parseFloat(cs.paddingBottom) || 0;
  return sh > pt + pb;
};

const stripHeightForWrappers = (
  el: Element,
  cs: CSSStyleDeclaration,
  snap: Record<string, string>,
): void => {
  if (el instanceof HTMLElement && el.style && el.style.height) return;

  const tag = el.tagName && el.tagName.toLowerCase();
  const ALLOWED_TAGS = ["div", "section", "article", "main", "aside", "header", "footer", "nav"];
  if (!tag || !ALLOWED_TAGS.includes(tag)) return;

  const usedH = parseFloat(cs.height);
  const TOL = 2;
  if (Number.isFinite(usedH) && el.scrollHeight > 0 && Math.abs(usedH - el.scrollHeight) > TOL)
    return;

  if (cs.aspectRatio && cs.aspectRatio !== "none" && cs.aspectRatio !== "auto") return;

  const disp = cs.display || "";
  if (disp.includes("flex") || disp.includes("grid")) return;

  if (isReplaced(el)) return;

  const pos = cs.position;
  if (pos === "absolute" || pos === "fixed" || pos === "sticky") return;
  if (cs.transform !== "none") return;
  if (hasBox(cs)) return;
  if (isFlexOrGridItem(el)) return;

  const overflowX = cs.overflowX || cs.overflow || "visible";
  const overflowY = cs.overflowY || cs.overflow || "visible";
  if (overflowX !== "visible" || overflowY !== "visible") return;

  const clip = cs.clip;
  if (clip && clip !== "auto" && clip !== "rect(auto, auto, auto, auto)") return;

  if (cs.visibility === "hidden" || cs.opacity === "0") return;

  if (!hasFlowFast(el, cs)) return;

  delete snap.height;
  delete snap["block-size"];
};
