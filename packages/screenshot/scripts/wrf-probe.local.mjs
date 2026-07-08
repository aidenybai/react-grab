import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const lib = readFileSync("dist/index.global.js", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://localhost:5179/70-stress.html", { waitUntil: "networkidle" });
await page.addScriptTag({ content: lib });
const out = await page.evaluate(async () => {
  const result = await FastHtmlToImage.captureNode(document.documentElement, { output: "svg" });
  const svgDataUrl = await result.toSvgDataUrl();
  const svgImage = new Image();
  svgImage.src = svgDataUrl;
  await svgImage.decode();
  const width = svgImage.naturalWidth;
  const height = svgImage.naturalHeight;
  const runVariant = async (useWillReadFrequently) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext(
      "2d",
      useWillReadFrequently ? { willReadFrequently: true } : undefined,
    );
    const timings = [];
    for (let run = 0; run < 6; run++) {
      const t0 = performance.now();
      context.drawImage(svgImage, 0, 0);
      const t1 = performance.now();
      await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      timings.push({ draw: Math.round(t1 - t0), encode: Math.round(performance.now() - t1) });
    }
    return timings;
  };
  return {
    size: `${width}x${height}`,
    gpu: await runVariant(false),
    cpu: await runVariant(true),
  };
});
console.log(JSON.stringify(out));
await browser.close();
