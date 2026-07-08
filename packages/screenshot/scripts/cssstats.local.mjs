import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const lib = readFileSync("dist/index.global.js", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5179/70-stress.html", { waitUntil: "networkidle" });
await page.addScriptTag({ content: lib });
const out = await page.evaluate(async () => {
  const target = document.querySelector("#target") ?? document.body;
  const r = await FastHtmlToImage.captureNode(target, { output: "svg" });
  const u = await r.toSvgDataUrl();
  const raw = decodeURIComponent(u.slice(u.indexOf(",") + 1));
  const css = raw.slice(raw.indexOf("<style>") + 7, raw.indexOf("</style>"));
  const rules = css.split("\n").filter(Boolean);
  const declCount = new Map();
  let totalBytes = 0;
  for (const r2 of rules) {
    const body = r2.slice(r2.indexOf("{") + 1, -1);
    for (const d of body.split(";")) {
      if (!d) continue;
      totalBytes += d.length + 1;
      declCount.set(d, (declCount.get(d) ?? 0) + 1);
    }
  }
  let dupBytes = 0,
    dupDecls = 0;
  for (const [d, c] of declCount) {
    if (c > 1) {
      dupBytes += (d.length + 1) * (c - 1);
      dupDecls += c - 1;
    }
  }
  return { cssLen: css.length, ruleCount: rules.length, totalBytes, dupBytes, dupDecls };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
