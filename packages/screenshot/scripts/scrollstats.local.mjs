import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const lib = readFileSync("/tmp/unmin-instr2.js", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5179/70-stress.html", { waitUntil: "networkidle" });
await page.addScriptTag({ content: lib });
const out = await page.evaluate(async () => {
  const t = document.querySelector("#target") ?? document.documentElement;
  await FastHtmlToImage.captureNode(t);
  globalThis.__scrollReads = 0;
  const t0 = performance.now();
  await FastHtmlToImage.captureNode(t);
  return { scrollReads: globalThis.__scrollReads, ms: performance.now() - t0 };
});
console.log(out);
await browser.close();
