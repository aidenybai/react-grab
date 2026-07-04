import { chromium, firefox, webkit } from "@playwright/test";
import { readFileSync } from "node:fs";

const fixtures = process.env.FIXTURES
  ? process.env.FIXTURES.split(",")
  : [
      "70-stress",
      "60-kitchen-sink",
      "site-analytics-dashboard-light",
      "site-video-grid-dark",
      "hard-stress-combo",
    ];
const warmRuns = Number(process.env.RUNS ?? 11);

const bundle = readFileSync(new URL("../dist/index.global.js", import.meta.url), "utf8");
const browserType = { chromium, firefox, webkit }[process.env.BROWSER ?? "chromium"];
const browser = await browserType.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const results = {};
for (const fixture of fixtures) {
  await page.goto(`http://localhost:5179/${fixture}.html`, { waitUntil: "networkidle" });
  await page.addScriptTag({ content: bundle });
  results[fixture] = await page.evaluate(async (runs) => {
    const capture = async () => {
      const start = performance.now();
      const result = await window.FastHtmlToImage.captureNode(document.documentElement, {
        pixelRatio: 1,
      });
      await result.toBlob();
      return performance.now() - start;
    };
    const mutationToggle = document.createElement("div");
    mutationToggle.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px";
    document.body.appendChild(mutationToggle);
    const cold = await capture();
    const coldPhases = { ...window.FastHtmlToImage.lastCaptureTimings };
    const samples = [];
    const phaseSamples = [];
    for (let i = 0; i < runs; i++) {
      mutationToggle.textContent = `${i}`;
      samples.push(await capture());
      phaseSamples.push({ ...window.FastHtmlToImage.lastCaptureTimings });
    }
    samples.sort((a, b) => a - b);
    const medianIndex = Math.floor(samples.length / 2);
    const phases = {};
    for (const key of Object.keys(phaseSamples[0])) {
      const vals = phaseSamples.map((p) => p[key]).sort((a, b) => a - b);
      phases[key] = Math.round(vals[medianIndex] * 100) / 100;
    }
    return {
      cold: Math.round(cold * 10) / 10,
      median: Math.round(samples[medianIndex] * 10) / 10,
      p90: Math.round(samples[Math.floor(samples.length * 0.9)] * 10) / 10,
      coldPhases: Object.fromEntries(
        Object.entries(coldPhases).map(([k, v]) => [k, Math.round(v * 10) / 10]),
      ),
      phases,
    };
  }, warmRuns);
  const r = results[fixture];
  console.log(
    `${fixture}: cold=${r.cold} median=${r.median} p90=${r.p90}\n  warm phases: ${JSON.stringify(r.phases)}\n  cold phases: ${JSON.stringify(r.coldPhases)}`,
  );
}
console.log(
  "SUMMARY " +
    JSON.stringify(
      Object.fromEntries(Object.entries(results).map(([k, v]) => [k, [v.cold, v.median]])),
    ),
);
await browser.close();
