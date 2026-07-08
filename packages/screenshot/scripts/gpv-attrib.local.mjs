import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = process.env.FIXTURE ?? "70-stress";
const bundle = readFileSync(new URL("../dist/index.global.js", import.meta.url), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:5179/${fixture}.html`, { waitUntil: "networkidle" });
await page.evaluate(() => {
  window.__stacks = new Map();
  window.__n = 0;
  const orig = CSSStyleDeclaration.prototype.getPropertyValue;
  CSSStyleDeclaration.prototype.getPropertyValue = function (p) {
    if ((window.__n++ & 63) === 0) {
      const s = new Error().stack
        .split("\n")
        .slice(2, 5)
        .join(" <- ")
        .replace(/https?:\/\/[^)\s]+/g, (m) => m.split("/").pop());
      window.__stacks.set(s, (window.__stacks.get(s) ?? 0) + 1);
    }
    return orig.call(this, p);
  };
});
await page.addScriptTag({ content: bundle });
const out = await page.evaluate(async () => {
  const r = await window.FastHtmlToImage.captureNode(document.documentElement, { pixelRatio: 1 });
  await r.toBlob();
  window.__stacks.clear();
  window.__n = 0;
  const r2 = await window.FastHtmlToImage.captureNode(document.documentElement, { pixelRatio: 1 });
  await r2.toBlob();
  return [...window.__stacks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
});
for (const [s, c] of out) console.log(c * 64, s);
await browser.close();
