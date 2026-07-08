import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = process.env.FIXTURE ?? "70-stress";
const bundle = readFileSync(new URL("../dist/index.global.js", import.meta.url), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:5179/${fixture}.html`, { waitUntil: "networkidle" });
await page.evaluate(() => {
  window.__counts = { gpv: 0, gcs: 0 };
  window.__gpvByProp = new Map();
  const origGpv = CSSStyleDeclaration.prototype.getPropertyValue;
  CSSStyleDeclaration.prototype.getPropertyValue = function (p) {
    window.__counts.gpv++;
    window.__gpvByProp.set(p, (window.__gpvByProp.get(p) ?? 0) + 1);
    return origGpv.call(this, p);
  };
  const origGcs = window.getComputedStyle;
  window.getComputedStyle = function (...args) {
    window.__counts.gcs++;
    return origGcs.apply(this, args);
  };
});
await page.addScriptTag({ content: bundle });
const out = await page.evaluate(async () => {
  const run = async () => {
    const r = await window.FastHtmlToImage.captureNode(document.documentElement, { pixelRatio: 1 });
    await r.toBlob();
  };
  const toggle = document.createElement("div");
  toggle.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px";
  document.body.appendChild(toggle);
  await run();
  const cold = { ...window.__counts };
  window.__counts.gpv = 0;
  window.__counts.gcs = 0;
  window.__gpvByProp.clear();
  toggle.textContent = "x";
  await run();
  const warm = { ...window.__counts };
  const topProps = [...window.__gpvByProp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);

  let ruleCount = 0;
  for (const sheet of document.styleSheets) {
    try {
      for (const _r of sheet.cssRules) {
        ruleCount++;
      }
    } catch {}
  }
  return { cold, warm, topProps, elements: document.querySelectorAll("*").length, ruleCount };
});
console.log(fixture, JSON.stringify(out));
await browser.close();
