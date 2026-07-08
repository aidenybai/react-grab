import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5179/70-stress.html", { waitUntil: "networkidle" });
const res = await page.evaluate(() => {
  const els = [...document.querySelectorAll("*")].slice(0, 500);
  const t0 = performance.now();
  let n = 0;
  for (const el of els) {
    const cs = getComputedStyle(el);
    n += cs.cssText.length;
  }
  const t1 = performance.now();
  let m = 0;
  const props = ["width", "height", "margin-top", "margin-left", "top", "left", "right", "bottom"];
  for (const el of els) {
    const cs = getComputedStyle(el);
    for (const p of props) m += cs.getPropertyValue(p).length;
  }
  const t2 = performance.now();
  // full 139-prop read
  const all = [];
  const cs0 = getComputedStyle(document.body);
  for (let i = 0; i < cs0.length && all.length < 139; i++) all.push(cs0.item(i));
  for (const el of els.slice(0, 100)) {
    const cs = getComputedStyle(el);
    for (const p of all) m += cs.getPropertyValue(p).length;
  }
  const t3 = performance.now();
  return {
    cssTextMsPer500: t1 - t0,
    lane8MsPer500: t2 - t1,
    full139MsPer100: t3 - t2,
    cssTextSample: getComputedStyle(els[10]).cssText.slice(0, 80),
  };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
