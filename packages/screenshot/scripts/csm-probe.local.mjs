import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5179/70-stress.html", { waitUntil: "networkidle" });
const res = await page.evaluate(() => {
  const els = [...document.querySelectorAll("*")].slice(0, 500);
  const props = ["width", "height", "margin-top", "margin-left", "top", "left", "right", "bottom"];
  let m = 0;
  // warmup
  for (const el of els) {
    const cs = getComputedStyle(el);
    for (const p of props) m += cs.getPropertyValue(p).length;
  }
  const t0 = performance.now();
  for (const el of els) {
    const cs = getComputedStyle(el);
    for (const p of props) m += cs.getPropertyValue(p).length;
  }
  const t1 = performance.now();
  for (const el of els) {
    const sm = el.computedStyleMap();
    for (const p of props) m += sm.get(p).toString().length;
  }
  const t2 = performance.now();
  for (const el of els) {
    const sm = el.computedStyleMap();
    for (const p of props) {
      const v = sm.get(p);
      m += v instanceof CSSUnitValue ? v.value : String(v).length;
    }
  }
  const t3 = performance.now();
  return { gpvMs: t1 - t0, csmToStringMs: t2 - t1, csmUnitMs: t3 - t2, m };
});
console.log(res);
await browser.close();
