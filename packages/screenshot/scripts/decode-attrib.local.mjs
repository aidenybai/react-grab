import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const bundle = readFileSync(new URL("../dist/index.global.js", import.meta.url), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://localhost:5179/70-stress.html", { waitUntil: "networkidle" });
await page.addScriptTag({ content: bundle });
const out = await page.evaluate(async () => {
  const result = await window.FastHtmlToImage.captureNode(document.documentElement, {
    pixelRatio: 1,
  });
  const svgDataUrl = await result.toSvgDataUrl();
  const commaIndex = svgDataUrl.indexOf(",");
  const markup = decodeURIComponent(svgDataUrl.slice(commaIndex + 1));
  const styleStart = markup.indexOf("<style");
  const styleEnd = markup.indexOf("</style>") + 8;
  const noCss = markup.slice(0, styleStart) + markup.slice(styleEnd);
  const decodeOne = async (m) => {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(m)}`;
    const t0 = performance.now();
    await img.decode();
    return performance.now() - t0;
  };
  const timings = { full: [], noCss: [] };
  for (let i = 0; i < 5; i++) {
    timings.full.push(Math.round(await decodeOne(markup + `<!--${i}-->`)));
    timings.noCss.push(Math.round(await decodeOne(noCss + `<!--${i}-->`)));
  }
  return timings;
});
console.log(JSON.stringify(out));
await browser.close();
