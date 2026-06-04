import { cache } from "../core/cache.js";
import { isIconFont } from "../modules/icon-fonts.js";
import { snapFetch } from "./snap-fetch.js";
import type { SnapshotExcludeFonts, SnapshotLocalFont } from "../types.js";
import {
  pickPrimaryFamily,
  pickAllFamilies,
  normWeight,
  normStyle,
  normStretchPct,
  parseWeightSpec,
  parseStyleSpec,
  parseStretchSpec,
  familiesFromRequired,
} from "./fonts/normalize.js";
import type { RequiredVariant } from "./fonts/normalize.js";
import {
  FACE_RE,
  extractSrcUrls,
  parseUnicodeRange,
  unicodeIntersects,
} from "./fonts/unicode-range.js";
import {
  buildSimpleExcluder,
  buildFontsCacheKey,
  dedupeFontFaces,
  IMPORT_ANY_RE,
  isLikelyFontStylesheet,
  inlineImportsAndRewrite,
  inlineUrlsInCssBlock,
  collectFacesFromSheet,
} from "./fonts/collect-faces.js";
import type { FontFaceMeta, CollectFacesContext, SnapshotFontFace } from "./fonts/collect-faces.js";

export { iconToImage } from "./fonts/icon.js";

export interface SnapshotLocalFontSpec extends SnapshotLocalFont {
  stretchPct?: number;
}

interface EmbedCustomFontsOptions {
  required?: Set<string>;
  usedCodepoints?: Set<number>;
  exclude?: SnapshotExcludeFonts;
  localFonts?: SnapshotLocalFontSpec[];
  useProxy?: string;
  fontStylesheetDomains?: string[];
}

export const embedCustomFonts = async ({
  required,
  usedCodepoints,
  exclude = undefined,
  localFonts = [],
  useProxy = "",
  fontStylesheetDomains = [],
}: EmbedCustomFontsOptions = {}): Promise<string> => {
  if (!(required instanceof Set)) required = new Set<string>();
  if (!(usedCodepoints instanceof Set)) usedCodepoints = new Set<number>();

  const requiredIndex = new Map<string, RequiredVariant[]>();
  for (const key of required) {
    const [fam, w, s, st] = String(key).split("__");
    if (!fam) continue;
    const famKey = fam.toLowerCase();
    const arr = requiredIndex.get(famKey) || [];
    arr.push({ w: parseInt(w, 10), s, st: parseInt(st, 10) });
    requiredIndex.set(famKey, arr);
  }

  const faceMatchesRequired = (
    fam: string,
    styleSpec: string,
    weightSpec: string,
    stretchSpec: string,
  ): boolean => {
    const famKey = String(fam).toLowerCase();
    if (!requiredIndex.has(famKey)) return false;

    const need = requiredIndex.get(famKey);
    if (!need) return false;
    const ws = parseWeightSpec(weightSpec);
    const ss = parseStyleSpec(styleSpec);
    const ts = parseStretchSpec(stretchSpec);

    const faceIsRange = ws.min !== ws.max;
    const faceSingleW = ws.min;

    const styleOK = (reqKind: string): boolean =>
      (ss.kind === "normal" && reqKind === "normal") ||
      (ss.kind !== "normal" && (reqKind === "italic" || reqKind === "oblique"));

    let exactMatched = false;

    for (const r of need) {
      const wOk = faceIsRange ? r.w >= ws.min && r.w <= ws.max : r.w === faceSingleW;
      const sOk = styleOK(normStyle(r.s));
      const tOk = r.st >= ts.min && r.st <= ts.max;

      if (wOk && sOk && tOk) {
        exactMatched = true;
        break;
      }
    }

    if (exactMatched) return true;

    if (!faceIsRange) {
      for (const r of need) {
        const sOk = styleOK(normStyle(r.s));
        const tOk = r.st >= ts.min && r.st <= ts.max;
        const nearWeight = Math.abs(faceSingleW - r.w) <= 300;
        if (nearWeight && sOk && tOk) return true;
      }
    }

    if (!faceIsRange && ss.kind === "normal") {
      const hasItalicRequest = need.some((r) => normStyle(r.s) !== "normal");
      if (hasItalicRequest) {
        for (const r of need) {
          const nearWeight = Math.abs(faceSingleW - r.w) <= 300;
          const stretchOK = r.st >= ts.min && r.st <= ts.max;
          if (nearWeight && stretchOK) {
            return true;
          }
        }
      }
    }

    return false;
  };

  const simpleExcluder = buildSimpleExcluder(exclude);

  const cacheKey = buildFontsCacheKey(
    required,
    exclude,
    localFonts,
    useProxy,
    fontStylesheetDomains,
  );
  if (cache.resource?.has(cacheKey)) {
    return cache.resource.get(cacheKey) as string;
  }

  const requiredFamilies = familiesFromRequired(required);

  const importUrls: string[] = [];
  const IMPORT_ANY_RE_LOCAL = IMPORT_ANY_RE;

  for (const styleTag of document.querySelectorAll("style")) {
    const cssText = styleTag.textContent || "";
    for (const m of cssText.matchAll(IMPORT_ANY_RE_LOCAL)) {
      const u = (m[2] || m[4] || "").trim();
      if (!u || isIconFont(u)) continue;
      const hasLink = Boolean(document.querySelector(`link[rel="stylesheet"][href="${u}"]`));
      if (!hasLink) importUrls.push(u);
    }
  }
  const injectedLinks: HTMLLinkElement[] = [];
  if (importUrls.length) {
    await Promise.all(
      importUrls.map(
        (u) =>
          new Promise<HTMLLinkElement | null>((resolve) => {
            if (document.querySelector(`link[rel="stylesheet"][href="${u}"]`)) return resolve(null);
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = u;
            link.setAttribute("data-snapshot", "injected-import");
            link.onload = () => resolve(link);
            link.onerror = () => resolve(null);
            document.head.appendChild(link);
            injectedLinks.push(link);
          }),
      ),
    );
  }

  let finalCSS = "";

  const linkNodes = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  ).filter((l) => Boolean(l.href));
  for (const l of injectedLinks) {
    try {
      l.remove();
    } catch {}
  }

  for (const link of linkNodes) {
    try {
      if (isIconFont(link.href)) continue;

      let cssText = "";
      let sameOrigin = false;
      try {
        sameOrigin = new URL(link.href, location.href).origin === location.origin;
      } catch {}

      if (!sameOrigin) {
        const allowedDomains = Array.isArray(fontStylesheetDomains) ? fontStylesheetDomains : [];
        if (!isLikelyFontStylesheet(link.href, requiredFamilies, allowedDomains)) continue;
      }

      if (sameOrigin) {
        const sheet = Array.from(document.styleSheets).find((s) => s.href === link.href);
        if (sheet) {
          try {
            const rules = sheet.cssRules || [];
            cssText = Array.from(rules)
              .map((r) => r.cssText)
              .join("");
          } catch {}
        }
      }

      if (!cssText) {
        const res = await snapFetch(link.href, { as: "text", useProxy });
        if (res?.ok && typeof res.data === "string") cssText = res.data;
        if (isIconFont(link.href)) continue;
      }

      cssText = await inlineImportsAndRewrite(cssText, link.href, useProxy);

      let facesOut = "";
      for (const face of cssText.match(FACE_RE) || []) {
        const famRaw = (face.match(/font-family:\s*([^;]+);/i)?.[1] || "").trim();
        const family = pickPrimaryFamily(famRaw);
        if (!family || isIconFont(family)) continue;

        const weightSpec = (face.match(/font-weight:\s*([^;]+);/i)?.[1] || "400").trim();
        const styleSpec = (face.match(/font-style:\s*([^;]+);/i)?.[1] || "normal").trim();
        const stretchSpec = (face.match(/font-stretch:\s*([^;]+);/i)?.[1] || "100%").trim();
        const urange = (face.match(/unicode-range:\s*([^;]+);/i)?.[1] || "").trim();
        const srcRaw = (face.match(/src\s*:\s*([^;}]+)[;}]/i)?.[1] || "").trim();
        const srcUrls = extractSrcUrls(srcRaw, link.href);

        if (!faceMatchesRequired(family, styleSpec, weightSpec, stretchSpec)) continue;
        const ranges = parseUnicodeRange(urange);
        if (!unicodeIntersects(usedCodepoints, ranges)) continue;

        const meta: FontFaceMeta = {
          family,
          weightSpec,
          styleSpec,
          stretchSpec,
          unicodeRange: urange,
          srcRaw,
          srcUrls,
          href: link.href,
        };
        if (exclude && simpleExcluder(meta, ranges)) continue;

        const newFace = /url\(/i.test(srcRaw)
          ? await inlineUrlsInCssBlock(face, link.href, useProxy)
          : face;
        facesOut += newFace;
      }

      if (facesOut.trim()) finalCSS += facesOut;
    } catch {
      console.warn("[snapshot] Failed to process stylesheet:", link.href);
    }
  }

  const ctx: CollectFacesContext = {
    requiredIndex,
    usedCodepoints,
    faceMatchesRequired,
    simpleExcluder: exclude ? buildSimpleExcluder(exclude) : null,
    useProxy,
    visitedSheets: new Set<string>(),
    depth: 0,
  };

  for (const sheet of document.styleSheets) {
    if (sheet.href && linkNodes.some((l) => l.href === sheet.href)) continue;
    try {
      const rootHref = sheet.href || location.origin + "/";
      if (rootHref) ctx.visitedSheets.add(rootHref);
      await collectFacesFromSheet(
        sheet,
        rootHref,
        async (faceCss: string) => {
          finalCSS += faceCss;
        },
        ctx,
      );
    } catch {}
  }

  try {
    for (const f of document.fonts || []) {
      const face = f as SnapshotFontFace;
      if (!face || !face.family || face.status !== "loaded" || !face._snapshotSrc) continue;
      const snapshotSrc = face._snapshotSrc;
      const fam = String(face.family).replace(/^['"]+|['"]+$/g, "");
      if (isIconFont(fam)) continue;
      if (!requiredIndex.has(fam.toLowerCase())) continue;

      if (
        exclude?.families &&
        exclude.families.some((n) => String(n).toLowerCase() === fam.toLowerCase())
      ) {
        continue;
      }

      let b64 = snapshotSrc;
      if (!String(b64).startsWith("data:")) {
        if (cache.resource?.has(snapshotSrc)) {
          b64 = cache.resource.get(snapshotSrc) as string;
          cache.font?.add(snapshotSrc);
        } else if (!cache.font?.has(snapshotSrc)) {
          try {
            const r = await snapFetch(snapshotSrc, { as: "dataURL", useProxy, silent: true });
            if (r.ok && typeof r.data === "string") {
              b64 = r.data;
              cache.resource?.set(snapshotSrc, b64);
              cache.font?.add(snapshotSrc);
            } else {
              continue;
            }
          } catch {
            console.warn("[snapshot] Failed to fetch dynamic font src:", snapshotSrc);
            continue;
          }
        }
      }
      finalCSS += `@font-face{font-family:'${fam}';src:url(${b64});font-style:${face.style || "normal"};font-weight:${face.weight || "normal"};}`;
    }
  } catch {}

  for (const font of localFonts) {
    if (!font || typeof font !== "object") continue;
    const family = String(font.family || "").replace(/^['"]+|['"]+$/g, "");
    if (!family || isIconFont(family)) continue;
    if (!requiredIndex.has(family.toLowerCase())) continue;
    if (
      exclude?.families &&
      exclude.families.some((n) => String(n).toLowerCase() === family.toLowerCase())
    )
      continue;

    const weight = font.weight != null ? String(font.weight) : "normal";
    const style = font.style != null ? String(font.style) : "normal";
    const stretch = font.stretchPct != null ? `${font.stretchPct}%` : "100%";
    const src = String(font.src || "");

    let b64 = src;
    if (!b64.startsWith("data:")) {
      if (cache.resource?.has(src)) {
        b64 = cache.resource.get(src) as string;
        cache.font?.add(src);
      } else if (!cache.font?.has(src)) {
        try {
          const r = await snapFetch(src, { as: "dataURL", useProxy, silent: true });
          if (r.ok && typeof r.data === "string") {
            b64 = r.data;
            cache.resource?.set(src, b64);
            cache.font?.add(src);
          } else {
            continue;
          }
        } catch {
          console.warn("[snapshot] Failed to fetch localFonts src:", src);
          continue;
        }
      }
    }
    finalCSS += `@font-face{font-family:'${family}';src:url(${b64});font-style:${style};font-weight:${weight};font-stretch:${stretch};}`;
  }

  if (finalCSS) {
    finalCSS = dedupeFontFaces(finalCSS);
    cache.resource?.set(cacheKey, finalCSS);
  }
  return finalCSS;
};

export const collectUsedFontVariants = (root: Element): Set<string> => {
  const req = /* @__PURE__ */ new Set<string>();
  if (!root) return req;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
  const addFromStyle = (cs: CSSStyleDeclaration): void => {
    const families = pickAllFamilies(cs.fontFamily);
    if (!families.length) return;
    for (const family of families) {
      const key = (w: string, s: string, st: string): string =>
        `${family}__${normWeight(w)}__${normStyle(s)}__${normStretchPct(st)}`;
      req.add(key(cs.fontWeight, cs.fontStyle, cs.fontStretch));
    }
  };
  addFromStyle(getComputedStyle(root));
  const csBeforeRoot = getComputedStyle(root, "::before");
  if (csBeforeRoot && csBeforeRoot.content && csBeforeRoot.content !== "none")
    addFromStyle(csBeforeRoot);
  const csAfterRoot = getComputedStyle(root, "::after");
  if (csAfterRoot && csAfterRoot.content && csAfterRoot.content !== "none")
    addFromStyle(csAfterRoot);
  while (tw.nextNode()) {
    const el = tw.currentNode as Element;
    const cs = getComputedStyle(el);
    addFromStyle(cs);
    const b = getComputedStyle(el, "::before");
    if (b && b.content && b.content !== "none") addFromStyle(b);
    const a = getComputedStyle(el, "::after");
    if (a && a.content && a.content !== "none") addFromStyle(a);
  }
  return req;
};

export const collectUsedCodepoints = (root: Element): Set<number> => {
  const used = /* @__PURE__ */ new Set<number>();
  const pushText = (txt: string): void => {
    if (!txt) return;
    for (const ch of txt) {
      const cp = ch.codePointAt(0);
      if (cp !== undefined) used.add(cp);
    }
  };
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    null,
  );
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (n.nodeType === Node.TEXT_NODE) {
      pushText(n.nodeValue || "");
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as Element;
      for (const pseudo of ["::before", "::after"]) {
        const cs = getComputedStyle(el, pseudo);
        const c = cs?.getPropertyValue("content");
        if (!c || c === "none") continue;
        if (/^"/.test(c) || /^'/.test(c)) {
          pushText(c.slice(1, -1));
        } else {
          const matches = c.match(/\\[0-9A-Fa-f]{1,6}/g);
          if (matches) {
            for (const m of matches) {
              try {
                used.add(parseInt(m.slice(1), 16));
              } catch {}
            }
          }
        }
      }
    }
  }
  return used;
};

export const ensureFontsReady = async (
  families: Set<string> | string[],
  warmupRepetitions: number = 2,
): Promise<void> => {
  try {
    await document.fonts.ready;
  } catch {}

  const fams = Array.from(families || []).filter(Boolean);
  if (fams.length === 0) return;

  const warmupOnce = (): void => {
    const container = document.createElement("div");
    container.style.cssText =
      "position:absolute!important;left:-9999px!important;top:0!important;opacity:0!important;pointer-events:none!important;contain:layout size style;";

    for (const fam of fams) {
      const span = document.createElement("span");
      span.textContent = "AaBbGg1234ÁÉÍÓÚçñ—∞";
      span.style.fontFamily = `"${fam}"`;
      span.style.fontWeight = "700";
      span.style.fontStyle = "italic";
      span.style.fontSize = "32px";
      span.style.lineHeight = "1";
      span.style.whiteSpace = "nowrap";
      span.style.margin = "0";
      span.style.padding = "0";
      container.appendChild(span);
    }

    document.body.appendChild(container);
    void container.offsetWidth;
    document.body.removeChild(container);
  };

  for (let i = 0; i < Math.max(1, warmupRepetitions); i++) {
    warmupOnce();
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  }
};
