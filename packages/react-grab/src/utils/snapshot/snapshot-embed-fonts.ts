import { fetchAsDataUrl } from "./fetch-as-data-url.js";

const GENERIC_FONT_FAMILIES = new Set([
  "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui",
  "emoji", "math", "fangsong", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded",
]);

const URL_PATTERN = /url\(\s*(['"]?)([^"')]+)\1\s*\)/g;

const extractPrimaryFontFamily = (familyList: string): string => {
  for (const rawFamily of familyList.split(",")) {
    const cleaned = rawFamily.trim().replace(/^['"]+|['"]+$/g, "");
    if (cleaned && !GENERIC_FONT_FAMILIES.has(cleaned.toLowerCase())) return cleaned;
  }
  return "";
};

const normalizeFontWeight = (weight: string | number): number => {
  const trimmed = String(weight ?? "400").trim().toLowerCase();
  if (trimmed === "normal") return 400;
  if (trimmed === "bold") return 700;
  const parsed = parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? Math.min(900, Math.max(100, parsed)) : 400;
};

const normalizeFontStyle = (style: string): string => {
  const trimmed = String(style ?? "normal").trim().toLowerCase();
  if (trimmed.startsWith("italic")) return "italic";
  if (trimmed.startsWith("oblique")) return "oblique";
  return "normal";
};

export const collectUsedFontVariants = (element: Element): Set<string> => {
  const usedVariants = new Set<string>();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);

  const processNode = (node: Element) => {
    const computed = getComputedStyle(node);
    const familyList = computed.fontFamily;
    if (!familyList) return;

    const primaryFamily = extractPrimaryFontFamily(familyList);
    if (!primaryFamily) return;

    const weight = normalizeFontWeight(computed.fontWeight);
    const style = normalizeFontStyle(computed.fontStyle);
    usedVariants.add(`${primaryFamily}__${weight}__${style}`);
  };

  processNode(element);
  while (walker.nextNode()) {
    processNode(walker.currentNode as Element);
  }

  return usedVariants;
};

const applyTextTransform = (text: string, textTransform: string): string => {
  switch (textTransform) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "capitalize":
      return text.replace(/\b\w/g, (character) => character.toUpperCase());
    default:
      return text;
  }
};

export const collectUsedCodepoints = (element: Element): Set<number> => {
  const codepoints = new Set<number>();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const textNode = walker.currentNode;
    let textContent = textNode.textContent || "";

    const parentElement = textNode.parentElement;
    if (parentElement) {
      const textTransform = getComputedStyle(parentElement).textTransform;
      textContent = applyTextTransform(textContent, textTransform);
    }

    for (let index = 0; index < textContent.length; index++) {
      const codepoint = textContent.codePointAt(index);
      if (codepoint !== undefined) {
        codepoints.add(codepoint);
        if (codepoint > 0xffff) index++;
      }
    }
  }

  return codepoints;
};

const inlineFontUrlsInCssBlock = async (cssBlock: string): Promise<string> => {
  let result = cssBlock;
  const matches = [...cssBlock.matchAll(URL_PATTERN)];

  for (const match of matches) {
    const originalUrl = match[2].trim();
    if (!originalUrl || originalUrl.startsWith("data:")) continue;

    let absoluteUrl = originalUrl;
    if (!absoluteUrl.startsWith("http")) {
      try {
        absoluteUrl = new URL(absoluteUrl, location.href).href;
      } catch {
        continue;
      }
    }

    const dataUrl = await fetchAsDataUrl(absoluteUrl);
    if (dataUrl) {
      result = result.replace(match[0], `url(${dataUrl})`);
    }
  }

  return result;
};

const parseUnicodeRange = (unicodeRange: string): Array<[number, number]> => {
  if (!unicodeRange) return [];
  const ranges: Array<[number, number]> = [];

  for (const part of unicodeRange.split(",").map((segment) => segment.trim()).filter(Boolean)) {
    const matched = part.match(/^U\+([0-9A-Fa-f?]+)(?:-([0-9A-Fa-f?]+))?$/);
    if (!matched) continue;

    const startHex = matched[1];
    const endHex = matched[2];

    if (endHex) {
      ranges.push([parseInt(startHex.replace(/\?/g, "0"), 16), parseInt(endHex.replace(/\?/g, "F"), 16)]);
    } else if (startHex.includes("?")) {
      ranges.push([parseInt(startHex.replace(/\?/g, "0"), 16), parseInt(startHex.replace(/\?/g, "F"), 16)]);
    } else {
      const value = parseInt(startHex, 16);
      ranges.push([value, value]);
    }
  }

  return ranges;
};

const unicodeRangeIntersects = (usedCodepoints: Set<number>, ranges: Array<[number, number]>): boolean => {
  if (ranges.length === 0 || usedCodepoints.size === 0) return true;
  for (const codepoint of usedCodepoints) {
    for (const [rangeStart, rangeEnd] of ranges) {
      if (codepoint >= rangeStart && codepoint <= rangeEnd) return true;
    }
  }
  return false;
};

interface FontFaceMatch {
  family: string;
  weight: string;
  style: string;
  src: string;
  unicodeRange: string;
}

const doesFontFaceMatchRequiredVariants = (
  fontFaceCandidate: FontFaceMatch,
  requiredIndex: Map<string, Array<{ weight: number; style: string }>>,
): boolean => {
  const variants = requiredIndex.get(fontFaceCandidate.family);
  if (!variants) return false;

  const faceWeight = normalizeFontWeight(fontFaceCandidate.weight);
  const faceStyle = normalizeFontStyle(fontFaceCandidate.style);

  for (const variant of variants) {
    const weightDistance = Math.abs(faceWeight - variant.weight);
    if (weightDistance <= 100 && faceStyle === variant.style) return true;
    if (weightDistance <= 100 && variant.style !== "normal") return true;
  }

  return false;
};

export const embedUsedFonts = async (element: Element): Promise<string> => {
  const requiredVariants = collectUsedFontVariants(element);
  const usedCodepoints = collectUsedCodepoints(element);

  if (requiredVariants.size === 0) return "";

  const requiredIndex = new Map<string, Array<{ weight: number; style: string }>>();
  for (const key of requiredVariants) {
    const [family, weightStr, style] = key.split("__");
    if (!family) continue;
    const variants = requiredIndex.get(family) || [];
    variants.push({ weight: parseInt(weightStr, 10), style });
    requiredIndex.set(family, variants);
  }

  const fontFaceBlocks: string[] = [];
  const seenSignatures = new Set<string>();

  const processFontFaceRule = async (rule: CSSFontFaceRule) => {
    const familyRaw = rule.style.getPropertyValue("font-family").trim();
    const family = extractPrimaryFontFamily(familyRaw);
    if (!family) return;

    const weightSpec = rule.style.getPropertyValue("font-weight").trim() || "400";
    const styleSpec = rule.style.getPropertyValue("font-style").trim() || "normal";
    const srcRaw = rule.style.getPropertyValue("src").trim();
    const unicodeRange = rule.style.getPropertyValue("unicode-range").trim();

    if (!srcRaw || !srcRaw.includes("url(")) return;

    const fontFaceCandidate: FontFaceMatch = { family, weight: weightSpec, style: styleSpec, src: srcRaw, unicodeRange };
    if (!doesFontFaceMatchRequiredVariants(fontFaceCandidate, requiredIndex)) return;

    const ranges = parseUnicodeRange(unicodeRange);
    if (!unicodeRangeIntersects(usedCodepoints, ranges)) return;

    const signature = `${family.toLowerCase()}|${weightSpec}|${styleSpec}|${unicodeRange.toLowerCase()}`;
    if (seenSignatures.has(signature)) return;
    seenSignatures.add(signature);

    const inlinedSrc = await inlineFontUrlsInCssBlock(srcRaw);
    const unicodeRangePart = unicodeRange ? `unicode-range:${unicodeRange};` : "";
    fontFaceBlocks.push(
      `@font-face{font-family:${family};src:${inlinedSrc};font-style:${styleSpec};font-weight:${weightSpec};${unicodeRangePart}}`,
    );
  };

  const collectFontFaceRulesRecursively = async (rules: CSSRuleList): Promise<void> => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSFontFaceRule) {
        await processFontFaceRule(rule);
      } else if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) {
        await collectFontFaceRulesRecursively((rule as CSSGroupingRule).cssRules);
      }
    }
  };

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      await collectFontFaceRulesRecursively(sheet.cssRules);
    } catch {
      continue;
    }
  }

  return fontFaceBlocks.join("\n");
};
