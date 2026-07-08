import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const lib = readFileSync("dist/index.global.js", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5179/70-stress.html", { waitUntil: "networkidle" });
await page.addScriptTag({ content: lib });
const out = await page.evaluate(async () => {
  const target = document.querySelector("#target") ?? document.body;
  const timings = [];
  for (let i = 0; i < 8; i++) {
    const t0 = performance.now();
    const res = await FastHtmlToImage.captureNode(target);
    const t1 = performance.now();
    await res.toPngDataUrl();
    const t2 = performance.now();
    timings.push({ capture: t1 - t0, png: t2 - t1, ...FastHtmlToImage.lastCaptureTimings });
  }
  return timings;
});
console.log(JSON.stringify(out.slice(2), null, 1));
await browser.close();
