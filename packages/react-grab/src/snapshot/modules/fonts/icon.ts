import type { SnapshotIconImageResult } from "../../types.js";

export const iconToImage = async (
  unicodeChar: string,
  fontFamily: string,
  fontWeight: string | number,
  fontSize: number = 32,
  color: string = "#000",
): Promise<SnapshotIconImageResult> => {
  fontFamily = fontFamily.replace(/^['"]+|['"]+$/g, "");
  const dpr = window.devicePixelRatio || 1;

  try {
    await document.fonts.ready;
  } catch {}

  const span = document.createElement("span");
  span.textContent = unicodeChar;
  span.style.position = "absolute";
  span.style.visibility = "hidden";
  span.style.fontFamily = `"${fontFamily}"`;
  span.style.fontWeight = String(fontWeight || "normal");
  span.style.fontSize = `${fontSize}px`;
  span.style.lineHeight = "1";
  span.style.whiteSpace = "nowrap";
  span.style.padding = "0";
  span.style.margin = "0";
  document.body.appendChild(span);

  const rect = span.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  document.body.removeChild(span);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width * dpr);
  canvas.height = Math.max(1, height * dpr);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("[snapshot] Failed to acquire 2D canvas context");
  ctx.scale(dpr, dpr);
  ctx.font = fontWeight
    ? `${fontWeight} ${fontSize}px "${fontFamily}"`
    : `${fontSize}px "${fontFamily}"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = color;
  ctx.fillText(unicodeChar, 0, 0);

  return {
    dataUrl: canvas.toDataURL(),
    width,
    height,
  };
};
