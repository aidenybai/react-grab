import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const lib = readFileSync("/tmp/unmin-instr.js", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5179/70-stress.html", { waitUntil: "networkidle" });
await page.addScriptTag({ content: lib });
const out = await page.evaluate(async () => {
  const t = document.querySelector("#target") ?? document.documentElement;
  await FastHtmlToImage.captureNode(t);
  globalThis.__regCalls = 0;
  globalThis.__sortedBuilds = 0;
  globalThis.__sigChars = 0;
  globalThis.__sortedHits = 0;
  await FastHtmlToImage.captureNode(t);
  return {
    regCalls: globalThis.__regCalls,
    sortedBuilds: globalThis.__sortedBuilds,
    sortedHits: globalThis.__sortedHits,
    sigChars: globalThis.__sigChars,
  };
});
console.log(out);
await browser.close();
