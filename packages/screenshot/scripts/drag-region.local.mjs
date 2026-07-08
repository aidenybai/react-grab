import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const bundle = readFileSync(new URL("../dist/index.global.js", import.meta.url), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
for (const fixture of ["site-analytics-dashboard-light", "70-stress"]) {
  await page.goto(`http://localhost:5179/${fixture}.html`);
  await page.addScriptTag({ content: bundle });
  const timings = await page.evaluate(async () => {
    const frames = [];
    for (let i = 0; i < 12; i++) {
      const region = { x: 100, y: 80, width: 200 + i * 20, height: 150 + i * 12 };
      const start = performance.now();
      const result = await window.FastHtmlToImage.captureRegion(region, { pixelRatio: 1 });
      await result.toBlob();
      frames.push(Math.round((performance.now() - start) * 10) / 10);
    }
    return frames;
  });
  console.log(fixture, JSON.stringify(timings));
}
await browser.close();
