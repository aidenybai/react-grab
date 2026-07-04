import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://localhost:5179/70-stress.html", { waitUntil: "networkidle" });
const out = await page.evaluate(() => {
  const elements = [...document.querySelectorAll("*")];
  const styles = elements.map((element) => getComputedStyle(element));
  const runs = 20;
  const measure = (label, fn) => {
    const start = performance.now();
    for (let run = 0; run < runs; run++) fn();
    return [label, Number(((performance.now() - start) / runs).toFixed(2))];
  };
  let sink = 0;
  const gpvBoth = measure("gpv width+height", () => {
    for (const style of styles) {
      sink += style.getPropertyValue("width").length + style.getPropertyValue("height").length;
    }
  });
  const rect = measure("getBoundingClientRect", () => {
    for (const element of elements) {
      const box = element.getBoundingClientRect();
      sink += box.width + box.height;
    }
  });
  const propAccess = measure("style.width+height prop", () => {
    for (const style of styles) {
      sink += style.width.length + style.height.length;
    }
  });
  return { gpvBoth, rect, propAccess, sink, count: elements.length };
});
console.log(JSON.stringify(out));
await browser.close();
