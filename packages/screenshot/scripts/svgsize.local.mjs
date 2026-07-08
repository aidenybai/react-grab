import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const lib = readFileSync("dist/index.global.js", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5179/70-stress.html", { waitUntil: "networkidle" });
await page.addScriptTag({ content: lib });
const out = await page.evaluate(async () => {
  const r = await FastHtmlToImage.captureNode(document.documentElement, { output: "svg" });
  const u = await r.toSvgDataUrl();
  const raw = decodeURIComponent(u.slice(u.indexOf(",") + 1));
  const styleStart = raw.indexOf("<style");
  const styleEnd = raw.indexOf("</style>");
  const dataUrlBytes = [...raw.matchAll(/data:[^"')]+/g)].reduce((a, m2) => a + m2[0].length, 0);
  return { total: raw.length, cssBytes: styleEnd - styleStart, dataUrlBytes };
});
console.log(JSON.stringify(out).slice(0, 500));
await browser.close();
