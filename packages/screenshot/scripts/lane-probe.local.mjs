import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const lib = readFileSync("/tmp/unmin.js", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:5179/${process.env.FIXTURE ?? "71-mega-grid"}.html`, {
  waitUntil: "networkidle",
});
await page.addScriptTag({ content: lib });
const out = await page.evaluate(async () => {
  const r = await FastHtmlToImage.captureNode(document.documentElement, { pixelRatio: 1 });
  await r.toBlob();
  return globalThis.__lane;
});
console.log(out.length, JSON.stringify(out));
await browser.close();
