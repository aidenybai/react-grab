import type { FontFaceSourceCollection, StyleRuleRecord } from "../types";
import { extractFontFaceBlocks } from "../utils/extract-font-face-blocks";
import { fetchAsText } from "../utils/fetch-as-text";
import { isCssFontFaceRule } from "../utils/is-css-font-face-rule";
import { parseFontFamilies } from "../utils/parse-font-families";
import { replaceCssUrls } from "../utils/replace-css-urls";
import { resolveUrl } from "../utils/resolve-url";
import { visitDocumentCssRules } from "../utils/visit-document-css-rules";
import { loadResourceAsDataUrl } from "./resource-loader";

const FONT_FAMILY_DESCRIPTOR_PATTERN = /font-family\s*:\s*([^;}]+)/i;

const collectFontFaceRuleSources = (sourceDocument: Document): FontFaceSourceCollection => {
  const collection: FontFaceSourceCollection = { ruleSources: [], inaccessibleSheetUrls: [] };
  visitDocumentCssRules(
    sourceDocument,
    (rule, baseUrl) => {
      if (isCssFontFaceRule(rule)) collection.ruleSources.push({ rule, baseUrl });
      return false;
    },
    (sheetUrl) => {
      if (sheetUrl) collection.inaccessibleSheetUrls.push(sheetUrl);
      return false;
    },
  );
  return collection;
};

const inlineFontFaceCssUrls = (
  fontFaceCssText: string,
  baseUrl: string | null,
  timeoutMs: number,
): Promise<string> =>
  replaceCssUrls(fontFaceCssText, async (url) => {
    if (url.startsWith("data:")) return url;
    const absoluteUrl = resolveUrl(url, baseUrl);
    return (await loadResourceAsDataUrl(absoluteUrl, timeoutMs)) ?? url;
  });

// CORS-blocked stylesheets (e.g. Google Fonts) hide their cssRules from the
// CSSOM, so their @font-face blocks are re-fetched as text and parsed
// tolerantly instead of being skipped.
const buildInaccessibleSheetFontCss = async (
  sheetUrl: string,
  usedFamilies: Set<string>,
  timeoutMs: number,
): Promise<string> => {
  const sheetCssText = await fetchAsText(sheetUrl, timeoutMs);
  if (!sheetCssText) return "";
  const blockChunks = await Promise.all(
    extractFontFaceBlocks(sheetCssText).map(async (fontFaceBlock) => {
      const familyMatch = FONT_FAMILY_DESCRIPTOR_PATTERN.exec(fontFaceBlock);
      const [declaredFamily] = parseFontFamilies(familyMatch?.[1]);
      if (!declaredFamily || !usedFamilies.has(declaredFamily)) return "";
      if (!fontFaceBlock.includes("url(")) return "";
      return await inlineFontFaceCssUrls(fontFaceBlock, sheetUrl, timeoutMs);
    }),
  );
  return blockChunks.filter((chunk) => chunk.length > 0).join("\n");
};

export const collectUsedFontFamilies = (rules: StyleRuleRecord[]): Set<string> => {
  const usedFamilies = new Set<string>();
  for (const rule of rules) {
    for (const styles of [
      rule.baseStyles,
      rule.beforeStyles,
      rule.afterStyles,
      rule.firstLetterStyles,
      rule.markerStyles,
    ]) {
      if (!styles) continue;
      for (const familyName of parseFontFamilies(styles["font-family"])) {
        usedFamilies.add(familyName);
      }
    }
  }
  return usedFamilies;
};

export const buildFontEmbedCss = async (
  usedFamilies: Set<string>,
  sourceDocument: Document,
  timeoutMs: number,
): Promise<string> => {
  if (usedFamilies.size === 0) return "";
  const { ruleSources, inaccessibleSheetUrls } = collectFontFaceRuleSources(sourceDocument);
  const cssChunks = await Promise.all([
    ...ruleSources.map(async ({ rule, baseUrl }) => {
      const [declaredFamily] = parseFontFamilies(rule.style.getPropertyValue("font-family"));
      if (!declaredFamily || !usedFamilies.has(declaredFamily)) return "";
      const ruleCssText = rule.cssText;
      if (!ruleCssText.includes("url(")) return "";
      return await inlineFontFaceCssUrls(ruleCssText, baseUrl, timeoutMs);
    }),
    ...inaccessibleSheetUrls.map((sheetUrl) =>
      buildInaccessibleSheetFontCss(sheetUrl, usedFamilies, timeoutMs),
    ),
  ]);
  return cssChunks.filter((chunk) => chunk.length > 0).join("\n");
};
