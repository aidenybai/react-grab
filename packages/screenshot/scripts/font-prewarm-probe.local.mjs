import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const lib = readFileSync("dist/index.global.js", "utf8");
const browser = await chromium.launch();

const measure = async (prewarm) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto("http://localhost:5179/70-stress.html", { waitUntil: "networkidle" });
  await page.addScriptTag({ content: lib });
  const result = await page.evaluate(async (shouldPrewarm) => {
    const capture = await FastHtmlToImage.captureNode(document.documentElement, {
      output: "svg",
    });
    const svgDataUrl = await capture.toSvgDataUrl();
    const svgMarkup = decodeURIComponent(
      svgDataUrl.slice("data:image/svg+xml;charset=utf-8,".length),
    );
    const fontFaceBlocks = svgMarkup.match(/@font-face\s*\{[^}]*\}/g) ?? [];
    if (shouldPrewarm && fontFaceBlocks.length > 0) {
      const familyNames = fontFaceBlocks
        .map((block) => (block.match(/font-family:\s*"([^"]+)"/) ?? [])[1])
        .filter(Boolean);
      const tinySvg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">` +
        `<style>${fontFaceBlocks.join("")}</style>` +
        `<text font-family="${familyNames.join(",").replaceAll(String.fromCharCode(34), "&quot;")}" y="6">a</text></svg>`;
      const tinyImage = new Image();
      tinyImage.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tinySvg)}`;
      const tPre = performance.now();
      await tinyImage.decode();
      var prewarmMs = Math.round(performance.now() - tPre);
    }
    const mainImage = new Image();
    mainImage.src = svgDataUrl;
    const t0 = performance.now();
    await mainImage.decode();
    return {
      fontBlocks: fontFaceBlocks.length,
      prewarmMs: prewarmMs ?? 0,
      decodeMs: Math.round(performance.now() - t0),
    };
  }, prewarm);
  await page.close();
  return result;
};

for (let i = 0; i < 3; i++) console.log("cold no-prewarm:", JSON.stringify(await measure(false)));
for (let i = 0; i < 3; i++) console.log("cold prewarm:   ", JSON.stringify(await measure(true)));
await browser.close();
