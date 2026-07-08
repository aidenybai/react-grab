import type { FontFaceSourceCollection, StyleRuleRecord } from "../types";
import { extractFontFaceBlocks } from "../utils/extract-font-face-blocks";
import { fetchAsText } from "../utils/fetch-as-text";
import { isCssFontFaceRule } from "../utils/is-css-font-face-rule";
import { parseFontFamilies } from "../utils/parse-font-families";
import {
  type FontFaceStyleKeyword,
  parseFontFaceStyleKeyword,
} from "../utils/parse-font-face-style-keyword";
import {
  type FontFaceWeightRange,
  parseFontFaceWeightRange,
} from "../utils/parse-font-face-weight-range";
import { replaceCssUrls } from "../utils/replace-css-urls";
import { resolveUrl } from "../utils/resolve-url";
import {
  type FontFaceCandidate,
  type FontVariantRequest,
  selectFontFaceIndexes,
} from "../utils/select-font-face-indexes";
import { visitDocumentCssRules } from "../utils/visit-document-css-rules";
import { loadResourceAsDataUrl } from "./resource-loader";

const FONT_FAMILY_DESCRIPTOR_PATTERN = /font-family\s*:\s*([^;}]+)/i;
const FONT_WEIGHT_DESCRIPTOR_PATTERN = /font-weight\s*:\s*([^;}]+)/i;
const FONT_STYLE_DESCRIPTOR_PATTERN = /font-style\s*:\s*([^;}]+)/i;
const FONT_STRETCH_DESCRIPTOR_PATTERN = /font-stretch\s*:\s*([^;}]+)/i;
const UNICODE_RANGE_DESCRIPTOR_PATTERN = /unicode-range\s*:\s*([^;}]+)/i;
const FONT_VARIATION_SETTINGS_PATTERN = /font-variation-settings\s*:/i;

interface FontFaceEmbedCandidate {
  familyName: string;
  fontFaceCssText: string;
  baseUrl: string | null;
  weightRange: FontFaceWeightRange | null;
  styleKeyword: FontFaceStyleKeyword | null;
  unicodeRangeKey: string;
  isPrunable: boolean;
}

const isNeutralStretchDescriptor = (stretchDescriptor: string): boolean => {
  const trimmedDescriptor = stretchDescriptor.trim().toLowerCase();
  return trimmedDescriptor === "" || trimmedDescriptor === "normal" || trimmedDescriptor === "auto";
};

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

const buildEmbedCandidate = (
  familyName: string,
  fontFaceCssText: string,
  baseUrl: string | null,
  weightDescriptor: string,
  styleDescriptor: string,
  stretchDescriptor: string,
  unicodeRangeDescriptor: string,
  hasVariationSettings: boolean,
): FontFaceEmbedCandidate => {
  const weightRange = parseFontFaceWeightRange(weightDescriptor);
  const styleKeyword = parseFontFaceStyleKeyword(styleDescriptor);
  return {
    familyName,
    fontFaceCssText,
    baseUrl,
    weightRange,
    styleKeyword,
    unicodeRangeKey: unicodeRangeDescriptor.trim().toLowerCase().replace(/\s+/g, ""),
    isPrunable:
      weightRange !== null &&
      styleKeyword !== null &&
      isNeutralStretchDescriptor(stretchDescriptor) &&
      !hasVariationSettings,
  };
};

// CORS-blocked stylesheets (e.g. Google Fonts) hide their cssRules from the
// CSSOM, so their @font-face blocks are re-fetched as text and parsed
// tolerantly instead of being skipped.
const collectInaccessibleSheetCandidates = async (
  sheetUrl: string,
  usedFamilies: Set<string>,
  timeoutMs: number,
): Promise<FontFaceEmbedCandidate[]> => {
  const sheetCssText = await fetchAsText(sheetUrl, timeoutMs);
  if (!sheetCssText) return [];
  const candidates: FontFaceEmbedCandidate[] = [];
  for (const fontFaceBlock of extractFontFaceBlocks(sheetCssText)) {
    const familyMatch = FONT_FAMILY_DESCRIPTOR_PATTERN.exec(fontFaceBlock);
    const [declaredFamily] = parseFontFamilies(familyMatch?.[1]);
    if (!declaredFamily || !usedFamilies.has(declaredFamily)) continue;
    if (!fontFaceBlock.includes("url(")) continue;
    candidates.push(
      buildEmbedCandidate(
        declaredFamily,
        fontFaceBlock,
        sheetUrl,
        FONT_WEIGHT_DESCRIPTOR_PATTERN.exec(fontFaceBlock)?.[1] ?? "",
        FONT_STYLE_DESCRIPTOR_PATTERN.exec(fontFaceBlock)?.[1] ?? "",
        FONT_STRETCH_DESCRIPTOR_PATTERN.exec(fontFaceBlock)?.[1] ?? "",
        UNICODE_RANGE_DESCRIPTOR_PATTERN.exec(fontFaceBlock)?.[1] ?? "",
        FONT_VARIATION_SETTINGS_PATTERN.test(fontFaceBlock),
      ),
    );
  }
  return candidates;
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

// Enumerates every (style, weight) variant the captured styles can request.
// Diffed rule styles omit properties equal to the tag baseline, so the UA
// defaults those omissions can stand for (400/700 weights, normal/italic
// styles) are always included. Returns null when any used weight is
// unparsable, which disables pruning entirely.
export const collectUsedFontVariants = (rules: StyleRuleRecord[]): FontVariantRequest[] | null => {
  const usedWeights = new Set<number>([400, 700]);
  const usedStyleKeywords = new Set<FontFaceStyleKeyword>(["normal", "italic"]);
  for (const rule of rules) {
    for (const styles of [
      rule.baseStyles,
      rule.beforeStyles,
      rule.afterStyles,
      rule.firstLetterStyles,
      rule.markerStyles,
    ]) {
      if (!styles) continue;
      const weightValue = styles["font-weight"];
      if (weightValue !== undefined) {
        const parsedWeight = parseFontFaceWeightRange(weightValue);
        if (parsedWeight === null || parsedWeight.minWeight !== parsedWeight.maxWeight) {
          return null;
        }
        usedWeights.add(parsedWeight.minWeight);
      }
      const styleValue = styles["font-style"];
      if (styleValue !== undefined) {
        const parsedStyle = parseFontFaceStyleKeyword(styleValue);
        if (parsedStyle === null) return null;
        usedStyleKeywords.add(parsedStyle);
      }
    }
  }
  const requests: FontVariantRequest[] = [];
  for (const weight of usedWeights) {
    for (const styleKeyword of usedStyleKeywords) {
      requests.push({ weight, styleKeyword });
    }
  }
  return requests;
};

// Faces of a used family that CSS font matching can never select for any
// requested (style, weight) variant are dropped before their sources are
// fetched. unicode-range partitions matching per codepoint, so selection runs
// within each (family, unicode-range) group. Families with unparsable
// descriptors, non-default font-stretch, or variation settings keep every
// face.
const selectEmbeddedCandidates = (
  candidates: FontFaceEmbedCandidate[],
  variantRequests: FontVariantRequest[] | null,
): FontFaceEmbedCandidate[] => {
  if (variantRequests === null) return candidates;
  const unprunableFamilies = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate.isPrunable) unprunableFamilies.add(candidate.familyName);
  }
  const candidateIndexesByGroup = new Map<string, number[]>();
  candidates.forEach((candidate, candidateIndex) => {
    if (unprunableFamilies.has(candidate.familyName)) return;
    const groupKey = `${candidate.familyName}\u0000${candidate.unicodeRangeKey}`;
    const groupIndexes = candidateIndexesByGroup.get(groupKey);
    if (groupIndexes === undefined) candidateIndexesByGroup.set(groupKey, [candidateIndex]);
    else groupIndexes.push(candidateIndex);
  });
  const keptIndexes = new Set<number>();
  for (const groupIndexes of candidateIndexesByGroup.values()) {
    const groupCandidates: FontFaceCandidate[] = groupIndexes.map((candidateIndex) => {
      const candidate = candidates[candidateIndex];
      return {
        minWeight: candidate.weightRange?.minWeight ?? 400,
        maxWeight: candidate.weightRange?.maxWeight ?? 400,
        styleKeyword: candidate.styleKeyword ?? "normal",
      };
    });
    for (const selectedIndex of selectFontFaceIndexes(groupCandidates, variantRequests)) {
      keptIndexes.add(groupIndexes[selectedIndex]);
    }
  }
  return candidates.filter(
    (candidate, candidateIndex) =>
      unprunableFamilies.has(candidate.familyName) || keptIndexes.has(candidateIndex),
  );
};

export const buildFontEmbedCss = async (
  usedFamilies: Set<string>,
  sourceDocument: Document,
  timeoutMs: number,
  variantRequests: FontVariantRequest[] | null = null,
): Promise<string> => {
  if (usedFamilies.size === 0) return "";
  const { ruleSources, inaccessibleSheetUrls } = collectFontFaceRuleSources(sourceDocument);
  const accessibleCandidates: FontFaceEmbedCandidate[] = [];
  for (const { rule, baseUrl } of ruleSources) {
    const [declaredFamily] = parseFontFamilies(rule.style.getPropertyValue("font-family"));
    if (!declaredFamily || !usedFamilies.has(declaredFamily)) continue;
    const ruleCssText = rule.cssText;
    if (!ruleCssText.includes("url(")) continue;
    accessibleCandidates.push(
      buildEmbedCandidate(
        declaredFamily,
        ruleCssText,
        baseUrl,
        rule.style.getPropertyValue("font-weight"),
        rule.style.getPropertyValue("font-style"),
        rule.style.getPropertyValue("font-stretch"),
        rule.style.getPropertyValue("unicode-range"),
        rule.style.getPropertyValue("font-variation-settings") !== "",
      ),
    );
  }
  const inaccessibleCandidateLists = await Promise.all(
    inaccessibleSheetUrls.map((sheetUrl) =>
      collectInaccessibleSheetCandidates(sheetUrl, usedFamilies, timeoutMs),
    ),
  );
  const allCandidates = accessibleCandidates.concat(...inaccessibleCandidateLists);
  const embeddedCandidates = selectEmbeddedCandidates(allCandidates, variantRequests);
  const cssChunks = await Promise.all(
    embeddedCandidates.map((candidate) =>
      inlineFontFaceCssUrls(candidate.fontFaceCssText, candidate.baseUrl, timeoutMs),
    ),
  );
  return cssChunks.filter((chunk) => chunk.length > 0).join("\n");
};
