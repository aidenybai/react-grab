import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5179/60-kitchen-sink.html", { waitUntil: "networkidle" });
const out = await page.evaluate(async () => {
  const url = "http://localhost:5179/assets/photo-landscape.png";
  const times = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    const res = await fetch(url, { mode: "cors", cache: "force-cache" });
    await res.blob();
    times.push(Math.round((performance.now() - t0) * 10) / 10);
  }
  const t0 = performance.now();
  const res = await fetch(url);
  await res.blob();
  times.push(Math.round((performance.now() - t0) * 10) / 10);
  return times;
});
console.log(JSON.stringify(out));
await browser.close();
