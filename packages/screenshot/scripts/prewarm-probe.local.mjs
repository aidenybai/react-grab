import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const bundle = readFileSync("dist/index.global.js", "utf8");
const fixture = process.env.FIXTURE ?? "71-mega-grid";

const measure = async (usePrewarm) => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://localhost:5179/${fixture}.html`, { waitUntil: "networkidle" });
  await page.addScriptTag({ content: bundle });
  const coldMs = await page.evaluate(async (shouldPrewarm) => {
    if (shouldPrewarm) {
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:absolute;left:-9999px;top:0;width:16px;height:16px;background:#fff;";
      probe.textContent = "prewarm";
      document.body.appendChild(probe);
      const r = await FastHtmlToImage.captureNode(probe);
      await r.toBlob();
      probe.remove();
    }
    const t = performance.now();
    const result = await FastHtmlToImage.captureNode(document.documentElement);
    await result.toBlob();
    return performance.now() - t;
  }, usePrewarm);
  await browser.close();
  return coldMs;
};

for (const usePrewarm of [false, true]) {
  const runs = [];
  for (let i = 0; i < 5; i++) runs.push(await measure(usePrewarm));
  runs.sort((a, b) => a - b);
  console.log(
    usePrewarm ? "prewarmed" : "cold     ",
    runs.map((r) => r.toFixed(0)).join(" "),
    "median",
    runs[2].toFixed(0),
  );
}
