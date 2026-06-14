import { idle, debugWarn } from "./index.js";
import { cache, EvictingMap } from "../core/cache.js";
import { snapFetch } from "../modules/snap-fetch.js";
import { inlineAllStyles } from "../modules/styles.js";
import type { SnapshotCaptureContext, SnapshotSessionCache } from "../types.js";

interface SrcsetPart {
  url: string;
  desc: string;
}

export const idleCallback = (
  childList: Node[],
  callback: (child: Node, done: (value: Node | null) => void) => void,
  fast: boolean,
): Promise<(Node | null)[]> => {
  return Promise.all(
    childList.map((child) => {
      return new Promise<Node | null>((resolve) => {
        const deal = (): void => {
          idle(
            (deadline?: IdleDeadline) => {
              const hasIdleBudget =
                deadline && typeof deadline.timeRemaining === "function"
                  ? deadline.timeRemaining() > 0
                  : true;

              if (hasIdleBudget) {
                callback(child, resolve);
              } else {
                deal();
              }
            },
            { fast },
          );
        };
        deal();
      });
    }),
  );
};

const addNotSlottedRightmost = (sel: string): string => {
  sel = sel.trim();
  if (!sel) return sel;
  if (/:not\(\s*\[data-sd-slotted\]\s*\)\s*$/.test(sel)) return sel;
  return `${sel}:not([data-sd-slotted])`;
};

const wrapWithScope = (
  selectorList: string,
  scopeSelector: string,
  excludeSlotted = true,
): string => {
  return selectorList
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (s.startsWith(":where(")) return s;

      if (s.startsWith("@")) return s;

      const body = excludeSlotted ? addNotSlottedRightmost(s) : s;
      return `:where(${scopeSelector} ${body})`;
    })
    .join(", ");
};

export const rewriteShadowCSS = (cssText: string, scopeSelector: string): string => {
  if (!cssText) return "";

  cssText = cssText.replace(/:host\(([^)]+)\)/g, (_: string, sel: string) => {
    return `:where(${scopeSelector}:is(${sel.trim()}))`;
  });
  cssText = cssText.replace(/:host\b/g, `:where(${scopeSelector})`);

  cssText = cssText.replace(/:host-context\(([^)]+)\)/g, (_: string, sel: string) => {
    return `:where(:where(${sel.trim()}) ${scopeSelector})`;
  });

  cssText = cssText.replace(/::slotted\(([^)]+)\)/g, (_: string, sel: string) => {
    return `:where(${scopeSelector} ${sel.trim()})`;
  });

  cssText = cssText.replace(
    /(^|})(\s*)([^@}{]+){/g,
    (_: string, brace: string, ws: string, selectorList: string) => {
      const wrapped = wrapWithScope(selectorList, scopeSelector, true);
      return `${brace}${ws}${wrapped}{`;
    },
  );

  return cssText;
};

export const nextShadowScopeId = (sessionCache: { shadowScopeSeq?: number }): string => {
  sessionCache.shadowScopeSeq = (sessionCache.shadowScopeSeq || 0) + 1;
  return `s${sessionCache.shadowScopeSeq}`;
};

export const extractShadowCSS = (sr: ShadowRoot): string => {
  let css = "";
  try {
    sr.querySelectorAll("style").forEach((s) => {
      css += (s.textContent || "") + "\n";
    });
    const sheets = sr.adoptedStyleSheets || [];
    for (const sh of sheets) {
      try {
        if (sh && sh.cssRules) {
          for (const rule of sh.cssRules) css += rule.cssText + "\n";
        }
      } catch {}
    }
  } catch {}
  return css;
};

export const injectScopedStyle = (hostClone: Element, cssText: string, scopeId: string): void => {
  if (!cssText) return;
  const style = document.createElement("style");
  style.setAttribute("data-sd", scopeId);
  style.textContent = cssText;
  hostClone.insertBefore(style, hostClone.firstChild || null);
};

export const freezeImgSrcset = (original: HTMLImageElement, cloned: HTMLImageElement): void => {
  try {
    const chosen = original.currentSrc || original.src || "";
    if (!chosen) return;
    cloned.setAttribute("src", chosen);
    cloned.removeAttribute("srcset");
    cloned.removeAttribute("sizes");
    cloned.loading = "eager";
    cloned.decoding = "sync";
  } catch {}
};

export const collectCustomPropsFromCSS = (cssText: string): Set<string> => {
  const out = new Set<string>();
  if (!cssText) return out;
  const re = /var\(\s*(--[A-Za-z0-9_-]+)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cssText))) out.add(m[1]);
  return out;
};

const resolveCustomProp = (el: Element, name: string): string => {
  try {
    const cs = getComputedStyle(el);
    const v = cs.getPropertyValue(name).trim();
    if (v) return v;
  } catch {}
  try {
    const rootCS = getComputedStyle(document.documentElement);
    const v = rootCS.getPropertyValue(name).trim();
    if (v) return v;
  } catch {}
  return "";
};

export const buildSeedCustomPropsRule = (
  hostEl: Element,
  names: Iterable<string>,
  scopeSelector: string,
): string => {
  const decls: string[] = [];
  for (const name of names) {
    const val = resolveCustomProp(hostEl, name);
    if (val) decls.push(`${name}: ${val};`);
  }
  if (!decls.length) return "";
  return `${scopeSelector}{${decls.join("")}}\n`;
};

export const markSlottedSubtree = (root: Element | null): void => {
  if (!root) return;
  if (root.nodeType === Node.ELEMENT_NODE) {
    root.setAttribute("data-sd-slotted", "");
  }
  if (root.querySelectorAll) {
    root.querySelectorAll("*").forEach((el) => el.setAttribute("data-sd-slotted", ""));
  }
};

const getAccessibleIframeDocument = async (
  iframe: HTMLIFrameElement,
  attempts = 3,
): Promise<Document | null> => {
  const probe = (): Document | null => {
    try {
      return iframe.contentDocument || iframe.contentWindow?.document || null;
    } catch {
      return null;
    }
  };
  let doc = probe();
  let i = 0;
  while (i < attempts && (!doc || (!doc.body && !doc.documentElement))) {
    await new Promise((r) => setTimeout(r, 0));
    doc = probe();
    i++;
  }
  return doc && (doc.body || doc.documentElement) ? doc : null;
};

const measureContentBox = (
  el: Element,
): { contentWidth: number; contentHeight: number; rect: DOMRect } => {
  const rect = el.getBoundingClientRect();
  let bl = 0,
    br = 0,
    bt = 0,
    bb = 0;
  try {
    const cs = getComputedStyle(el);
    bl = parseFloat(cs.borderLeftWidth) || 0;
    br = parseFloat(cs.borderRightWidth) || 0;
    bt = parseFloat(cs.borderTopWidth) || 0;
    bb = parseFloat(cs.borderBottomWidth) || 0;
  } catch {}
  const contentWidth = Math.max(0, Math.round(rect.width - (bl + br)));
  const contentHeight = Math.max(0, Math.round(rect.height - (bt + bb)));
  return { contentWidth, contentHeight, rect };
};

export const getUnscaledDimensions = (el: Element): { width: number; height: number } => {
  let width = 0;
  let height = 0;

  const sized = el as HTMLImageElement;

  if (sized.offsetWidth > 0) width = sized.offsetWidth;
  if (sized.offsetHeight > 0) height = sized.offsetHeight;

  if (width === 0 || height === 0) {
    try {
      const cs = getComputedStyle(el);
      if (width === 0) {
        const w = parseFloat(cs.width);
        if (!isNaN(w) && w > 0) width = w;
      }
      if (height === 0) {
        const h = parseFloat(cs.height);
        if (!isNaN(h) && h > 0) height = h;
      }
    } catch {}
  }

  if (width === 0 || height === 0) {
    try {
      if (width === 0) {
        const w = parseFloat(el.getAttribute("width") ?? "");
        if (!isNaN(w) && w > 0) width = w;
      }
      if (height === 0) {
        const h = parseFloat(el.getAttribute("height") ?? "");
        if (!isNaN(h) && h > 0) height = h;
      }
    } catch {}
  }

  if ((width === 0 || height === 0) && (sized.naturalWidth || sized.naturalHeight)) {
    try {
      if (width === 0 && sized.naturalWidth > 0) width = sized.naturalWidth;
      if (height === 0 && sized.naturalHeight > 0) height = sized.naturalHeight;
    } catch {}
  }

  return { width, height };
};

const pinIframeViewport = (doc: Document, w: number, h: number): (() => void) => {
  const win = doc.defaultView;
  const sx = win ? win.scrollX : 0;
  const sy = win ? win.scrollY : 0;
  const bsl = doc.body ? doc.body.scrollLeft : 0;
  const bst = doc.body ? doc.body.scrollTop : 0;
  const hsl = doc.documentElement ? doc.documentElement.scrollLeft : 0;
  const hst = doc.documentElement ? doc.documentElement.scrollTop : 0;

  const style = doc.createElement("style");
  style.setAttribute("data-sd-iframe-pin", "");
  style.textContent = `html, body {margin: 0 !important;padding: 0 !important;width: ${w}px !important;height: ${h}px !important;min-width: ${w}px !important;min-height: ${h}px !important;box-sizing: border-box !important;overflow: hidden !important;background-clip: border-box !important;}`;
  (doc.head || doc.documentElement).appendChild(style);

  return () => {
    try {
      style.remove();
    } catch {}
    try {
      if (win && typeof win.scrollTo === "function") win.scrollTo(sx, sy);
      if (doc.body) {
        doc.body.scrollLeft = bsl;
        doc.body.scrollTop = bst;
      }
      if (doc.documentElement) {
        doc.documentElement.scrollLeft = hsl;
        doc.documentElement.scrollTop = hst;
      }
    } catch {}
  };
};

export const rasterizeIframe = async (
  iframe: HTMLIFrameElement,
  sessionCache: SnapshotSessionCache,
  options: SnapshotCaptureContext,
): Promise<HTMLElement> => {
  const doc = await getAccessibleIframeDocument(iframe, 3);
  if (!doc) throw new Error("iframe document not accessible/ready");

  const { contentWidth, contentHeight, rect } = measureContentBox(iframe);

  let snap = options?.snap;
  const globalWithSnapshot = window as unknown as { snapshot?: SnapshotCaptureContext["snap"] };
  if (!snap && typeof window !== "undefined" && globalWithSnapshot.snapshot) {
    snap = globalWithSnapshot.snapshot;
  }
  if (!snap || typeof snap.toPng !== "function") {
    throw new Error(
      "[snapshot] iframe capture requires snapshot.toPng. Use snapshot(el) or pass options.snap. " +
        "With ESM, assign window.snapshot = snapshot after import if using iframes.",
    );
  }

  const nested = { ...options, scale: 1 };

  const unpin = pinIframeViewport(doc, contentWidth, contentHeight);
  let imgEl: HTMLImageElement;
  try {
    imgEl = await snap.toPng(doc.documentElement, nested);
  } finally {
    unpin();
  }

  imgEl.style.display = "block";
  imgEl.style.width = `${contentWidth}px`;
  imgEl.style.height = `${contentHeight}px`;

  const wrapper = document.createElement("div");
  sessionCache.nodeMap.set(wrapper, iframe);
  inlineAllStyles(iframe, wrapper, sessionCache, options);
  wrapper.style.overflow = "hidden";
  wrapper.style.display = "block";
  if (!wrapper.style.width) wrapper.style.width = `${Math.round(rect.width)}px`;
  if (!wrapper.style.height) wrapper.style.height = `${Math.round(rect.height)}px`;

  wrapper.appendChild(imgEl);
  return wrapper;
};

export const createCheckboxRadioReplacement = (
  node: HTMLInputElement,
): { el: HTMLDivElement; applyVisual: () => void } => {
  const { width: unscaledW, height: unscaledH } = getUnscaledDimensions(node);
  const rect = node.getBoundingClientRect();
  let cs: CSSStyleDeclaration | undefined;
  try {
    cs = window.getComputedStyle(node);
  } catch {}
  const parsedW = cs ? parseFloat(cs.width) : NaN;
  const parsedH = cs ? parseFloat(cs.height) : NaN;
  const rw = Math.round(unscaledW || rect.width || 0);
  const rh = Math.round(unscaledH || rect.height || 0);
  const w = Number.isFinite(parsedW) && parsedW > 0 ? Math.round(parsedW) : Math.max(12, rw || 16);
  const h = Number.isFinite(parsedH) && parsedH > 0 ? Math.round(parsedH) : Math.max(12, rh || 16);
  const isCheckbox = (node.type || "text").toLowerCase() === "checkbox";
  const checked = Boolean(node.checked);
  const indeterminate = Boolean(node.indeterminate);

  const size = Math.max(Math.min(w, h), 12);
  const s = size;

  let vAlign = "middle";
  try {
    if (cs && cs.verticalAlign) vAlign = cs.verticalAlign;
  } catch {}

  const box = document.createElement("div");
  box.setAttribute("data-snapshot-input-replacement", node.type || "checkbox");
  box.style.cssText = `display:inline-block;width:${s}px;height:${s}px;vertical-align:${vAlign};flex-shrink:0;line-height:0;`;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(s));
  svg.setAttribute("height", String(s));
  svg.setAttribute("viewBox", `0 0 ${s} ${s}`);
  box.appendChild(svg);

  const applyVisual = (): void => {
    let color = "#0a6ed1";
    try {
      if (cs) color = cs.accentColor || cs.color || color;
    } catch {}
    const stroke = 2;
    const pad = stroke / 2;
    const inner = s - stroke;
    svg.innerHTML = "";
    if (isCheckbox) {
      const rectEl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rectEl.setAttribute("x", String(pad));
      rectEl.setAttribute("y", String(pad));
      rectEl.setAttribute("width", String(inner));
      rectEl.setAttribute("height", String(inner));
      rectEl.setAttribute("rx", "2");
      rectEl.setAttribute("ry", "2");
      rectEl.setAttribute("fill", checked ? color : "none");
      rectEl.setAttribute("stroke", color);
      rectEl.setAttribute("stroke-width", String(stroke));
      svg.appendChild(rectEl);
      if (checked) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute(
          "d",
          `M ${pad + 2} ${s / 2} L ${s / 2 - 1} ${s - pad - 2} L ${s - pad - 2} ${pad + 2}`,
        );
        path.setAttribute("stroke", "white");
        path.setAttribute("stroke-width", String(Math.max(1.5, stroke)));
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        svg.appendChild(path);
      } else if (indeterminate) {
        const dash = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        const dw = Math.max(6, inner - 4);
        dash.setAttribute("x", String((s - dw) / 2));
        dash.setAttribute("y", String((s - stroke) / 2));
        dash.setAttribute("width", String(dw));
        dash.setAttribute("height", String(stroke));
        dash.setAttribute("fill", color);
        dash.setAttribute("rx", "1");
        svg.appendChild(dash);
      }
    } else {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(s / 2));
      circle.setAttribute("cy", String(s / 2));
      circle.setAttribute("r", String((s - stroke) / 2));
      circle.setAttribute("fill", checked ? color : "none");
      circle.setAttribute("stroke", color);
      circle.setAttribute("stroke-width", String(stroke));
      svg.appendChild(circle);
      if (checked) {
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const r = Math.max(2, (s - stroke * 2) * 0.35);
        dot.setAttribute("cx", String(s / 2));
        dot.setAttribute("cy", String(s / 2));
        dot.setAttribute("r", String(r));
        dot.setAttribute("fill", "white");
        svg.appendChild(dot);
      }
    }
    box.style.setProperty("width", `${s}px`, "important");
    box.style.setProperty("height", `${s}px`, "important");
    box.style.setProperty("min-width", `${s}px`, "important");
    box.style.setProperty("min-height", `${s}px`, "important");
  };
  applyVisual();
  return { el: box, applyVisual };
};

const _blobToDataUrlCache = new EvictingMap(80);

export const blobUrlToDataUrl = async (blobUrl: string): Promise<string> => {
  if (cache.resource?.has(blobUrl)) return cache.resource.get(blobUrl) as string;

  if (_blobToDataUrlCache.has(blobUrl))
    return _blobToDataUrlCache.get(blobUrl) as string | Promise<string>;

  const p = (async (): Promise<string> => {
    const r = await snapFetch(blobUrl, { as: "dataURL", silent: true });
    if (!r.ok || typeof r.data !== "string") {
      throw new Error(`[snapshot] Failed to read blob URL: ${blobUrl}`);
    }
    cache.resource?.set(blobUrl, r.data);
    return r.data;
  })();

  _blobToDataUrlCache.set(blobUrl, p);
  try {
    const data = await p;
    _blobToDataUrlCache.set(blobUrl, data);
    return data;
  } catch (e) {
    _blobToDataUrlCache.delete(blobUrl);
    throw e;
  }
};

const BLOB_URL_RE = /\bblob:[^)"'\s]+/g;

const replaceBlobUrlsInCssText = async (cssText: string): Promise<string> => {
  if (!cssText || cssText.indexOf("blob:") === -1) return cssText;
  const uniques = Array.from(new Set(cssText.match(BLOB_URL_RE) || []));
  if (uniques.length === 0) return cssText;
  let out = cssText;
  for (const u of uniques) {
    try {
      const d = await blobUrlToDataUrl(u);
      out = out.split(u).join(d);
    } catch {}
  }
  return out;
};

const isBlobUrl = (u: unknown): u is string => {
  return typeof u === "string" && u.startsWith("blob:");
};

const parseSrcset = (srcset: string): SrcsetPart[] => {
  return (srcset || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      const m = item.match(/^(\S+)(\s+.+)?$/);
      return m ? { url: m[1], desc: m[2] || "" } : null;
    })
    .filter((part): part is SrcsetPart => Boolean(part));
};

const stringifySrcset = (parts: SrcsetPart[]): string => {
  return parts.map((p) => (p.desc ? `${p.url} ${p.desc.trim()}` : p.url)).join(", ");
};

export const resolveBlobUrlsInTree = async (
  root: ParentNode | null,
  sessionCache: SnapshotCaptureContext | null = null,
): Promise<void> => {
  if (!root) return;
  const ctx = sessionCache;

  const imgs = root.querySelectorAll ? root.querySelectorAll("img") : [];
  for (const img of imgs) {
    try {
      const srcAttr = img.getAttribute("src");
      const effective = srcAttr || img.currentSrc || "";
      if (isBlobUrl(effective)) {
        const data = await blobUrlToDataUrl(effective);
        img.setAttribute("src", data);
      }
      const srcset = img.getAttribute("srcset");
      if (srcset && srcset.includes("blob:")) {
        const parts = parseSrcset(srcset);
        let changed = false;
        for (const p of parts) {
          if (isBlobUrl(p.url)) {
            try {
              p.url = await blobUrlToDataUrl(p.url);
              changed = true;
            } catch (e) {
              debugWarn(ctx, "blobUrlToDataUrl for srcset item failed", e);
            }
          }
        }
        if (changed) img.setAttribute("srcset", stringifySrcset(parts));
      }
    } catch (e) {
      debugWarn(ctx, "resolveBlobUrls for img failed", e);
    }
  }

  const svgImages = root.querySelectorAll ? root.querySelectorAll("image") : [];
  for (const node of svgImages) {
    try {
      const XLINK_NS = "http://www.w3.org/1999/xlink";
      const href = node.getAttribute("href") || node.getAttributeNS?.(XLINK_NS, "href");
      if (isBlobUrl(href)) {
        const d = await blobUrlToDataUrl(href);
        node.setAttribute("href", d);
        node.removeAttributeNS?.(XLINK_NS, "href");
      }
    } catch (e) {
      debugWarn(ctx, "resolveBlobUrls for SVG image href failed", e);
    }
  }

  const styled = root.querySelectorAll ? root.querySelectorAll("[style*='blob:']") : [];
  for (const el of styled) {
    try {
      const styleText = el.getAttribute("style");
      if (styleText && styleText.includes("blob:")) {
        const replaced = await replaceBlobUrlsInCssText(styleText);
        el.setAttribute("style", replaced);
      }
    } catch (e) {
      debugWarn(ctx, "replaceBlobUrls in inline style failed", e);
    }
  }

  const styleTags = root.querySelectorAll ? root.querySelectorAll("style") : [];
  for (const s of styleTags) {
    try {
      const css = s.textContent || "";
      if (css.includes("blob:")) {
        s.textContent = await replaceBlobUrlsInCssText(css);
      }
    } catch (e) {
      debugWarn(ctx, "replaceBlobUrls in style tag failed", e);
    }
  }

  const urlAttrs = ["poster"];
  for (const attr of urlAttrs) {
    const nodes = root.querySelectorAll ? root.querySelectorAll(`[${attr}^='blob:']`) : [];
    for (const n of nodes) {
      try {
        const u = n.getAttribute(attr);
        if (isBlobUrl(u)) {
          n.setAttribute(attr, await blobUrlToDataUrl(u));
        }
      } catch (e) {
        debugWarn(ctx, `resolveBlobUrls for ${attr} failed`, e);
      }
    }
  }
};
