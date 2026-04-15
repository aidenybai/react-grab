import { fetchAsDataUrl } from "./fetch-as-data-url.js";

const BACKGROUND_URL_PATTERN = /url\(\s*["']?([^"')]+)["']?\s*\)/g;

const isInlinableUrl = (url: string): boolean => {
  if (!url) return false;
  if (url.startsWith("data:")) return false;
  if (url.startsWith("#")) return false;
  if (url.startsWith("about:")) return false;
  return true;
};

const URL_BEARING_PROPERTIES = [
  "background-image",
  "mask",
  "mask-image",
  "-webkit-mask",
  "-webkit-mask-image",
  "border-image-source",
];

const BACKGROUND_LAYOUT_PROPERTIES = [
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-size",
  "background-repeat",
  "background-origin",
  "background-clip",
  "background-attachment",
];

const MASK_LAYOUT_PROPERTIES = [
  "mask-position",
  "mask-size",
  "mask-repeat",
  "mask-origin",
  "mask-clip",
  "-webkit-mask-position",
  "-webkit-mask-size",
  "-webkit-mask-repeat",
];

const resolveToAbsoluteUrl = (url: string): string => {
  if (/^https?:\/\//.test(url) || url.startsWith("blob:")) return url;
  try {
    return new URL(url, location.href).href;
  } catch {
    return url;
  }
};

const replaceUrlsWithDataUrls = async (value: string): Promise<string> => {
  let result = value;
  const matches = [...value.matchAll(BACKGROUND_URL_PATTERN)];
  const uniqueUrls = [...new Set(matches.map((match) => match[1]).filter(isInlinableUrl))];

  for (const originalUrl of uniqueUrls) {
    const absoluteUrl = resolveToAbsoluteUrl(originalUrl);
    const dataUrl = await fetchAsDataUrl(absoluteUrl);
    if (dataUrl) {
      result = result.replaceAll(originalUrl, dataUrl);
    }
  }

  return result;
};

export const inlineAllBackgroundUrls = async (
  sourceElement: Element,
  styles: Record<string, string>,
): Promise<void> => {
  const computed = getComputedStyle(sourceElement);

  for (const property of URL_BEARING_PROPERTIES) {
    let value = styles[property] || computed.getPropertyValue(property);
    if (!value || value === "none") continue;

    if (property === "background-image" && (!value || value === "none")) {
      const backgroundShorthand = computed.getPropertyValue("background");
      if (backgroundShorthand && /url\s*\(/.test(backgroundShorthand)) {
        value = backgroundShorthand;
      }
    }

    if (!BACKGROUND_URL_PATTERN.test(value)) {
      BACKGROUND_URL_PATTERN.lastIndex = 0;
      continue;
    }
    BACKGROUND_URL_PATTERN.lastIndex = 0;

    const inlinedValue = await replaceUrlsWithDataUrls(value);
    if (inlinedValue !== value) {
      styles[property] = inlinedValue;
    }
  }

  for (const property of [...BACKGROUND_LAYOUT_PROPERTIES, ...MASK_LAYOUT_PROPERTIES]) {
    const value = computed.getPropertyValue(property);
    if (value && value !== "initial") {
      styles[property] = value;
    }
  }

  const hasBorderImage =
    computed.getPropertyValue("border-image-source") !== "none" &&
    computed.getPropertyValue("border-image-source") !== "";

  if (hasBorderImage) {
    for (const property of ["border-image-slice", "border-image-width", "border-image-outset", "border-image-repeat"]) {
      const value = computed.getPropertyValue(property);
      if (value && value !== "initial") {
        styles[property] = value;
      }
    }
  }
};
