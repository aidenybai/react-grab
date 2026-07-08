import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const bundle = readFileSync(new URL("../dist/index.global.js", import.meta.url), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
for (const fixture of ["site-analytics-dashboard-light", "70-stress"]) {
  await page.goto(`http://localhost:5179/${fixture}.html`);
  await page.addScriptTag({ content: bundle });
  const timings = await page.evaluate(async () => {
    const region = { x: 120, y: 100, width: 400, height: 300 };
    const time = async (fn) => {
      const runs = [];
      for (let i = 0; i < 7; i++) {
        const start = performance.now();
        const result = await fn();
        await result.toBlob();
        runs.push(performance.now() - start);
      }
      runs.sort((a, b) => a - b);
      return { cold: Math.round(runs[runs.length - 1]), median: Math.round(runs[3]) };
    };
    const full = await time(() =>
      window.FastHtmlToImage.captureNode(document.documentElement, { pixelRatio: 1 }),
    );
    const regionTimed = await time(() =>
      window.FastHtmlToImage.captureRegion(region, { pixelRatio: 1 }),
    );
    const regionNoCull = await time(() =>
      window.FastHtmlToImage.captureRegion(region, { pixelRatio: 1, cullMarginPx: -1 }),
    );
    return { full, regionTimed, regionNoCull };
  });
  console.log(fixture, JSON.stringify(timings));
}
await browser.close();
