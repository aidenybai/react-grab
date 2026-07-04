import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = process.env.FIXTURE ?? "70-stress";
const bundle = readFileSync(new URL("../dist/index.global.js", import.meta.url), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:5179/${fixture}.html`, { waitUntil: "networkidle" });
await page.addScriptTag({ content: bundle });
const out = await page.evaluate(async () => {
  const r = await window.FastHtmlToImage.captureNode(document.documentElement, { pixelRatio: 1 });
  await r.toBlob();
  return globalThis.__memoStats;
});
console.log(fixture, JSON.stringify(out));
await browser.close();
