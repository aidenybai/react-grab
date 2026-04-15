import { SNAPSHOT_DEFAULT_FONT_SIZE_PX } from "../../constants.js";

const ICON_FONT_PATTERNS = [
  /font\s*awesome/i,
  /material\s*icons/i,
  /material\s*symbols/i,
  /ionicons/i,
  /glyphicons/i,
  /feather/i,
  /bootstrap\s*icons/i,
  /remix\s*icons/i,
  /heroicons/i,
  /lucide/i,
];

export const isIconFontFamily = (fontFamily: string): boolean => {
  for (const pattern of ICON_FONT_PATTERNS) {
    if (pattern.test(fontFamily)) return true;
  }
  return /icon/i.test(fontFamily) || /glyph/i.test(fontFamily) || /symbols/i.test(fontFamily);
};

export const rasterizeIconToDataUrl = async (
  character: string,
  fontFamily: string,
  fontWeight: string | number,
  fontSize: number,
  color: string,
): Promise<{ dataUrl: string; width: number; height: number } | null> => {
  const cleanedFamily = fontFamily.replace(/^['"]+|['"]+$/g, "");
  const devicePixelRatio = window.devicePixelRatio || 1;

  try {
    await document.fonts.ready;
  } catch {
    return null;
  }

  const measureSpan = document.createElement("span");
  measureSpan.textContent = character;
  measureSpan.style.cssText = `position:absolute;visibility:hidden;font-family:"${cleanedFamily}";font-weight:${fontWeight || "normal"};font-size:${fontSize}px;line-height:1;white-space:nowrap;padding:0;margin:0;`;
  document.body.appendChild(measureSpan);

  const spanRect = measureSpan.getBoundingClientRect();
  const measuredWidth = Math.ceil(spanRect.width);
  const measuredHeight = Math.ceil(spanRect.height);
  measureSpan.remove();

  if (measuredWidth <= 0 || measuredHeight <= 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, measuredWidth * devicePixelRatio);
  canvas.height = Math.max(1, measuredHeight * devicePixelRatio);

  const canvasContext = canvas.getContext("2d");
  if (!canvasContext) return null;

  canvasContext.scale(devicePixelRatio, devicePixelRatio);
  canvasContext.font = fontWeight
    ? `${fontWeight} ${fontSize}px "${cleanedFamily}"`
    : `${fontSize}px "${cleanedFamily}"`;
  canvasContext.textAlign = "left";
  canvasContext.textBaseline = "top";
  canvasContext.fillStyle = color;
  canvasContext.fillText(character, 0, 0);

  return {
    dataUrl: canvas.toDataURL(),
    width: measuredWidth,
    height: measuredHeight,
  };
};

export const rasterizeIconFontElementToImage = async (
  element: Element,
): Promise<string | null> => {
  const computed = getComputedStyle(element);
  const fontFamily = computed.fontFamily;

  if (!isIconFontFamily(fontFamily)) return null;

  const textContent = element.textContent?.trim();
  if (!textContent || textContent.length > 2) return null;

  const fontSize = parseFloat(computed.fontSize) || SNAPSHOT_DEFAULT_FONT_SIZE_PX;
  const color = computed.color || "#000";
  const fontWeight = computed.fontWeight || "normal";

  const rasterized = await rasterizeIconToDataUrl(textContent, fontFamily, fontWeight, fontSize, color);
  if (!rasterized) return null;

  return `<img src="${rasterized.dataUrl}" width="${rasterized.width}" height="${rasterized.height}" style="vertical-align:middle;display:inline;" alt="${textContent}">`;
};
