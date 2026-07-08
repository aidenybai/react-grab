import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const lib = readFileSync("/tmp/unmin.js", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5179/60-kitchen-sink.html", { waitUntil: "networkidle" });
await page.addScriptTag({ content: lib });
const out = await page.evaluate(async () => {
  const events = [];
  const origFetch = window.fetch;
  window.fetch = async (...args) => {
    const t0 = performance.now();
    const res = await origFetch(...args);
    events.push([String(args[0]).slice(0, 80), Math.round(performance.now() - t0)]);
    return res;
  };
  const t0 = performance.now();
  const r = await FastHtmlToImage.captureNode(document.documentElement);
  await r.toBlob();
  const total = performance.now() - t0;
  return { total, timings: FastHtmlToImage.lastCaptureTimings, events };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
