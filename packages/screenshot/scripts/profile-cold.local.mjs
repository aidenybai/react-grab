import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const fixture = process.env.FIXTURE ?? "70-stress";
const bundle = readFileSync("/tmp/unmin.js", "utf8");
const browser = await chromium.launch();
const aggregate = new Map();
for (let run = 0; run < 6; run++) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://localhost:5179/${fixture}.html`, { waitUntil: "networkidle" });
  await page.addScriptTag({ content: bundle });
  const client = await page.context().newCDPSession(page);
  await client.send("Profiler.enable");
  await client.send("Profiler.setSamplingInterval", { interval: 50 });
  await client.send("Profiler.start");
  await page.evaluate(async () => {
    const result = await window.FastHtmlToImage.captureNode(document.documentElement, {
      pixelRatio: 1,
    });
    await result.toBlob();
  });
  const { profile } = await client.send("Profiler.stop");
  const nodeById = new Map(profile.nodes.map((n) => [n.id, n]));
  for (let i = 0; i < profile.samples.length; i++) {
    const node = nodeById.get(profile.samples[i]);
    const dt = profile.timeDeltas[i] ?? 0;
    const key = `${node.callFrame.functionName || "(anon)"} :${node.callFrame.lineNumber}`;
    aggregate.set(key, (aggregate.get(key) ?? 0) + dt);
  }
  await page.close();
}
const sorted = [...aggregate.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
for (const [key, us] of sorted) console.log(`${(us / 6000).toFixed(1)}ms  ${key}`);
await browser.close();
