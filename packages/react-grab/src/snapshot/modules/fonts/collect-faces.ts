import { extractURL } from "../../utils/helpers.js";
import { cache } from "../../core/cache.js";
import { isIconFont } from "../icon-fonts.js";
import { snapFetch } from "../snap-fetch.js";
import type { SnapshotExcludeFonts } from "../../types.js";
import type { SnapshotLocalFontSpec } from "../fonts.js";
import {
  normalizeUrl,
  rewriteRelativeUrls,
  pickPrimaryFamily,
  baseFamilyToken,
  FONT_LIBRARIES,
} from "./normalize.js";
import type { RequiredVariant } from "./normalize.js";
import {
  URL_RE,
  parseUnicodeRange,
  unicodeIntersects,
  extractSrcUrls,
  subsetFromRanges,
} from "./unicode-range.js";

export interface FontFaceMeta {
  family: string;
  weightSpec: string;
  styleSpec: string;
  stretchSpec: string;
  unicodeRange: string;
  srcRaw: string;
  srcUrls: string[];
  href: string;
}

export type FontFaceExcluder = (
  meta: FontFaceMeta,
  parsedRanges: Array<[number, number]>,
) => boolean;

export interface CollectFacesContext {
  requiredIndex: Map<string, RequiredVariant[]>;
  usedCodepoints: Set<number>;
  faceMatchesRequired: (
    fam: string,
    styleSpec: string,
    weightSpec: string,
    stretchSpec: string,
  ) => boolean;
  simpleExcluder: FontFaceExcluder | null;
  useProxy: string;
  visitedSheets: Set<string>;
  depth: number;
}

export const isLikelyFontStylesheet = (
  href: string,
  requiredFamilies: Set<string>,
  allowedDomains: string[] = [],
): boolean => {
  if (!href) return false;
  try {
    const u = new URL(href, location.href);
    const sameOrigin = u.origin === location.origin;
    if (sameOrigin) return true;

    const host = u.host.toLowerCase();
    const FONT_HOSTS = [
      "fonts.googleapis.com",
      "fonts.gstatic.com",
      "use.typekit.net",
      "p.typekit.net",
      "kit.fontawesome.com",
      "use.fontawesome.com",
      "cdn.jsdelivr.net",
      "unpkg.com",
      "cdnjs.cloudflare.com",
      "esm.sh",
    ];
    if (FONT_HOSTS.some((h) => host.endsWith(h))) return true;
    if (
      allowedDomains.some((d) => host === d.toLowerCase() || host.endsWith("." + d.toLowerCase()))
    )
      return true;

    const path = (u.pathname + u.search).toLowerCase();
    if (/\bfont(s)?\b/.test(path) || /\.woff2?(\b|$)/.test(path)) return true;

    if (FONT_LIBRARIES.some((lib) => path.includes(lib))) return true;

    for (const fam of requiredFamilies) {
      const tokenA = fam.toLowerCase().replace(/\s+/g, "+");
      const tokenB = fam.toLowerCase().replace(/\s+/g, "-");
      const baseToken = baseFamilyToken(fam);
      if (path.includes(tokenA) || path.includes(tokenB)) return true;
      if (baseToken && path.includes(baseToken)) return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const IMPORT_ANY_RE =
  /@import\s+(?:url\(\s*(['"]?)([^)"']+)\1\s*\)|(['"])([^"']+)\3)([^;]*);/g;

const MAX_IMPORT_DEPTH = 4;

export const inlineImportsAndRewrite = async (
  cssText: string,
  ownerHref: string,
  useProxy: string,
): Promise<string> => {
  if (!cssText) return cssText;

  const visited = new Set<string>();

  const resolveOnce = async (
    text: string,
    baseHref: string,
    depth: number = 0,
  ): Promise<string> => {
    if (depth > MAX_IMPORT_DEPTH) {
      console.warn(`[snapshot] @import depth exceeded (${MAX_IMPORT_DEPTH}) at ${baseHref}`);
      return text;
    }

    // Fresh regex per call: IMPORT_ANY_RE is global (/g) and resolveOnce recurses, so a
    // shared lastIndex would make nested @import scans start mid-string and miss rules.
    const importRe = new RegExp(IMPORT_ANY_RE.source, "g");
    let out = "";
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(text))) {
      out += text.slice(last, m.index);
      last = importRe.lastIndex;

      const rawUrl = (m[2] || m[4] || "").trim();
      const absUrl = normalizeUrl(rawUrl, baseHref);

      if (visited.has(absUrl)) {
        console.warn(`[snapshot] Skipping circular @import: ${absUrl}`);
        continue;
      }
      visited.add(absUrl);

      let imported = "";
      try {
        const r = await snapFetch(absUrl, { as: "text", useProxy, silent: true });
        if (r.ok && typeof r.data === "string") imported = r.data;
      } catch {}

      if (imported) {
        imported = rewriteRelativeUrls(imported, absUrl);
        imported = await resolveOnce(imported, absUrl, depth + 1);
        out += `\n/* inlined: ${absUrl} */\n${imported}\n`;
      } else {
        out += m[0];
      }
    }
    out += text.slice(last);
    return out;
  };

  let rewritten = rewriteRelativeUrls(cssText, ownerHref || location.href);
  rewritten = await resolveOnce(rewritten, ownerHref || location.href, 0);
  return rewritten;
};

export const inlineUrlsInCssBlock = async (
  cssBlock: string,
  baseHref: string,
  useProxy: string = "",
): Promise<string> => {
  let out = cssBlock;
  for (const m of cssBlock.matchAll(URL_RE)) {
    const raw = extractURL(m[0]);
    if (!raw) continue;
    let abs = raw;
    if (!abs.startsWith("http") && !abs.startsWith("data:")) {
      try {
        abs = new URL(abs, baseHref || location.href).href;
      } catch {}
    }
    if (isIconFont(abs)) continue;

    if (cache.resource?.has(abs)) {
      cache.font?.add(abs);
      out = out.replace(m[0], `url(${cache.resource.get(abs)})`);
      continue;
    }
    if (cache.font?.has(abs)) continue;

    try {
      const r = await snapFetch(abs, { as: "dataURL", useProxy, silent: true });
      if (r.ok && typeof r.data === "string") {
        const b64 = r.data;
        cache.resource?.set(abs, b64);
        cache.font?.add(abs);
        out = out.replace(m[0], `url(${b64})`);
      }
    } catch {
      console.warn("[snapshot] Failed to fetch font resource:", abs);
    }
  }
  return out;
};

export const buildSimpleExcluder = (ex: SnapshotExcludeFonts = {}): FontFaceExcluder => {
  const famSet = new Set((ex.families || []).map((s) => String(s).toLowerCase()));
  const domSet = new Set((ex.domains || []).map((s) => String(s).toLowerCase()));
  const subSet = new Set((ex.subsets || []).map((s) => String(s).toLowerCase()));
  return (meta: FontFaceMeta, parsedRanges: Array<[number, number]>): boolean => {
    if (famSet.size && famSet.has(meta.family.toLowerCase())) return true;
    if (domSet.size) {
      for (const u of meta.srcUrls) {
        try {
          if (domSet.has(new URL(u).host.toLowerCase())) return true;
        } catch {}
      }
    }
    if (subSet.size) {
      const label = subsetFromRanges(parsedRanges);
      if (label && subSet.has(label)) return true;
    }
    return false;
  };
};

export const dedupeFontFaces = (cssText: string): string => {
  if (!cssText) return cssText;

  const FACE_RE_G = /@font-face[^{}]*\{[^}]*\}/gi;

  const seen = new Set<string>();
  const out: string[] = [];

  for (const block of cssText.match(FACE_RE_G) || []) {
    const familyRaw = block.match(/font-family:\s*([^;]+);/i)?.[1] || "";
    const family = pickPrimaryFamily(familyRaw);
    const weightSpec = (block.match(/font-weight:\s*([^;]+);/i)?.[1] || "400").trim();
    const styleSpec = (block.match(/font-style:\s*([^;]+);/i)?.[1] || "normal").trim();
    const stretchSpec = (block.match(/font-stretch:\s*([^;]+);/i)?.[1] || "100%").trim();
    const urange = (block.match(/unicode-range:\s*([^;]+);/i)?.[1] || "").trim();
    const srcRaw = (block.match(/src\s*:\s*([^;}]+)[;}]/i)?.[1] || "").trim();

    const urls = extractSrcUrls(srcRaw, location.href);
    const srcPart = urls.length
      ? urls
          .map((u) => String(u).toLowerCase())
          .sort()
          .join("|")
      : srcRaw.toLowerCase();

    const key = [
      String(family || "").toLowerCase(),
      weightSpec,
      styleSpec,
      stretchSpec,
      urange.toLowerCase(),
      srcPart,
    ].join("|");

    if (!seen.has(key)) {
      seen.add(key);
      out.push(block);
    }
  }

  if (out.length === 0) return cssText;

  let i = 0;
  return cssText.replace(FACE_RE_G, () => out[i++] || "");
};

export const buildFontsCacheKey = (
  required: Set<string>,
  exclude: SnapshotExcludeFonts | undefined,
  localFonts: SnapshotLocalFontSpec[],
  useProxy: string,
  fontStylesheetDomains: string[],
): string => {
  const req = Array.from(required || [])
    .sort()
    .join("|");
  const ex = exclude
    ? JSON.stringify({
        families: (exclude.families || []).map((s) => String(s).toLowerCase()).sort(),
        domains: (exclude.domains || []).map((s) => String(s).toLowerCase()).sort(),
        subsets: (exclude.subsets || []).map((s) => String(s).toLowerCase()).sort(),
      })
    : "";
  const lf = (localFonts || [])
    .map(
      (f) =>
        `${(f.family || "").toLowerCase()}::${f.weight || "normal"}::${f.style || "normal"}::${f.src || ""}`,
    )
    .sort()
    .join("|");
  const px = useProxy || "";
  const fd = (fontStylesheetDomains || [])
    .map((s) => String(s).toLowerCase())
    .sort()
    .join("|");
  return `fonts-embed-css::req=${req}::ex=${ex}::lf=${lf}::px=${px}::fd=${fd}`;
};

export const collectFacesFromSheet = async (
  sheet: CSSStyleSheet,
  baseHref: string,
  emitFace: (css: string) => Promise<void> | void,
  ctx: CollectFacesContext,
): Promise<void> => {
  let rules: CSSRuleList | CSSRule[] = [];
  try {
    rules = sheet.cssRules || [];
  } catch {
    return;
  }

  for (const rule of rules) {
    if (rule.type === CSSRule.IMPORT_RULE && (rule as CSSImportRule).styleSheet) {
      const importRule = rule as CSSImportRule;
      const childHref = importRule.href ? normalizeUrl(importRule.href, baseHref) : baseHref;

      if (ctx.depth >= MAX_IMPORT_DEPTH) {
        console.warn(
          `[snapshot] CSSOM import depth exceeded (${MAX_IMPORT_DEPTH}) at ${childHref}`,
        );
        continue;
      }
      if (childHref && ctx.visitedSheets.has(childHref)) {
        console.warn(`[snapshot] Skipping circular CSSOM import: ${childHref}`);
        continue;
      }
      if (childHref) ctx.visitedSheets.add(childHref);

      const nextCtx: CollectFacesContext = { ...ctx, depth: (ctx.depth || 0) + 1 };
      if (importRule.styleSheet) {
        await collectFacesFromSheet(importRule.styleSheet, childHref, emitFace, nextCtx);
      }
      continue;
    }

    if (rule.type === CSSRule.FONT_FACE_RULE) {
      const fontFaceRule = rule as CSSFontFaceRule;
      const famRaw = (fontFaceRule.style.getPropertyValue("font-family") || "").trim();
      const family = pickPrimaryFamily(famRaw);
      if (!family || isIconFont(family)) continue;

      const weightSpec = (fontFaceRule.style.getPropertyValue("font-weight") || "400").trim();
      const styleSpec = (fontFaceRule.style.getPropertyValue("font-style") || "normal").trim();
      const stretchSpec = (fontFaceRule.style.getPropertyValue("font-stretch") || "100%").trim();
      const srcRaw = (fontFaceRule.style.getPropertyValue("src") || "").trim();
      const urange = (fontFaceRule.style.getPropertyValue("unicode-range") || "").trim();

      if (!ctx.faceMatchesRequired(family, styleSpec, weightSpec, stretchSpec)) continue;
      const ranges = parseUnicodeRange(urange);
      if (!unicodeIntersects(ctx.usedCodepoints, ranges)) continue;

      const meta: FontFaceMeta = {
        family,
        weightSpec,
        styleSpec,
        stretchSpec,
        unicodeRange: urange,
        srcRaw,
        srcUrls: extractSrcUrls(srcRaw, baseHref || location.href),
        href: baseHref || location.href,
      };
      if (ctx.simpleExcluder && ctx.simpleExcluder(meta, ranges)) continue;

      if (/url\(/i.test(srcRaw)) {
        const inlinedSrc = await inlineUrlsInCssBlock(
          srcRaw,
          baseHref || location.href,
          ctx.useProxy,
        );
        await emitFace(
          `@font-face{font-family:${family};src:${inlinedSrc};font-style:${styleSpec};font-weight:${weightSpec};font-stretch:${stretchSpec};${urange ? `unicode-range:${urange};` : ""}}`,
        );
      } else {
        await emitFace(
          `@font-face{font-family:${family};src:${srcRaw};font-style:${styleSpec};font-weight:${weightSpec};font-stretch:${stretchSpec};${urange ? `unicode-range:${urange};` : ""}}`,
        );
      }
    }
  }
};
