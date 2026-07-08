import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://localhost:5179/70-stress.html", { waitUntil: "networkidle" });
const out = await page.evaluate(() => {
  const els = [...document.querySelectorAll("*")].slice(0, 500);
  const cs0 = getComputedStyle(els[0]);
  const propNames = [];
  for (let i = 0; i < cs0.length; i++) propNames.push(cs0.item(i));
  const results = {};
  results.elementCount = document.querySelectorAll("*").length;
  results.propCount = propNames.length;
  let t = performance.now();
  let sink = 0;
  for (const el of els) {
    const cs = getComputedStyle(el);
    for (const p of propNames) sink += cs.getPropertyValue(p).length;
  }
  results.getPropertyValueMs = Math.round(performance.now() - t);
  t = performance.now();
  for (const el of els) {
    const cs = getComputedStyle(el);
    sink += cs.cssText.length;
  }
  results.cssTextMs = Math.round(performance.now() - t);
  results.cssTextSample = getComputedStyle(els[10]).cssText.slice(0, 200);
  t = performance.now();
  for (const el of els) {
    const map = el.computedStyleMap();
    for (const [k, v] of map) sink += k.length + String(v).length;
  }
  results.styleMapMs = Math.round(performance.now() - t);
  t = performance.now();
  for (const el of els) {
    const cs = getComputedStyle(el);
    for (let i = 0; i < cs.length; i++) sink += cs.getPropertyValue(cs.item(i)).length;
  }
  results.itemLoopMs = Math.round(performance.now() - t);
  results.sink = sink;
  return results;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
