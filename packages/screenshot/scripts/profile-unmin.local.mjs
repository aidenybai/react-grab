import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const fixture = process.env.FIXTURE ?? "70-stress";
const bundle = readFileSync("/tmp/unmin.js", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:5179/${fixture}.html`, { waitUntil: "networkidle" });
await page.addScriptTag({ content: bundle });
const client = await page.context().newCDPSession(page);
await page.evaluate(async () => {
  const result = await window.FastHtmlToImage.captureNode(document.documentElement, {
    pixelRatio: 1,
  });
  await result.toBlob();
});
await client.send("Profiler.enable");
await client.send("Profiler.setSamplingInterval", { interval: 50 });
await client.send("Profiler.start");
await page.evaluate(async () => {
  const mutationToggle = document.createElement("div");
  mutationToggle.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px";
  document.body.appendChild(mutationToggle);
  for (let i = 0; i < 10; i++) {
    mutationToggle.textContent = `${i}`;
    const result = await window.FastHtmlToImage.captureNode(document.documentElement, {
      pixelRatio: 1,
    });
    await result.toBlob();
  }
});
const { profile } = await client.send("Profiler.stop");
writeFileSync("profile.local.cpuprofile", JSON.stringify(profile));
const selfTime = new Map();
const nodeById = new Map(profile.nodes.map((n) => [n.id, n]));

for (let i = 0; i < profile.samples.length; i++) {
  const node = nodeById.get(profile.samples[i]);
  const dt = profile.timeDeltas[i] ?? 0;
  const key = `${node.callFrame.functionName || "(anon)"} ${node.callFrame.url.split("/").pop()}:${node.callFrame.lineNumber}`;
  selfTime.set(key, (selfTime.get(key) ?? 0) + dt);
}
const sorted = [...selfTime.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
for (const [key, us] of sorted) console.log(`${(us / 1000).toFixed(1)}ms  ${key}`);
await browser.close();
