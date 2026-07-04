import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://localhost:5179/70-stress.html", { waitUntil: "networkidle" });
const out = await page.evaluate(() => {
  const elements = [...document.querySelectorAll("*")].slice(0, 1400);
  const styles = elements.map((el) => getComputedStyle(el));
  const time = (fn) => {
    const t0 = performance.now();
    for (let round = 0; round < 10; round++) for (const cs of styles) fn(cs);
    return Math.round(((performance.now() - t0) / 10) * 100) / 100;
  };
  let sink = 0;
  const gpv = time((cs) => {
    sink += cs.getPropertyValue("width").length + cs.getPropertyValue("height").length;
  });
  const prop = time((cs) => {
    sink += cs.width.length + cs.height.length;
  });
  const gpv2 = time((cs) => {
    sink += cs.getPropertyValue("width").length + cs.getPropertyValue("height").length;
  });
  return { gpv, prop, gpv2, sink };
});
console.log(JSON.stringify(out));
await browser.close();
