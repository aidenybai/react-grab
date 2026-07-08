import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const lib = readFileSync("dist/index.global.js", "utf8").replace(
  "createRelevantStylePropRegistry",
  "createRelevantStylePropRegistry",
);
const browser = await chromium.launch();
const page = await browser.newPage();
for (const fx of ["70-stress", "60-kitchen-sink"]) {
  await page.goto(`http://localhost:5179/${fx}.html`, { waitUntil: "networkidle" });
  await page.addScriptTag({ content: lib });
  const lane = await page.evaluate(() => {
    // re-derive the lane by scanning like the registry does is hard; instead intercept getPropertyValue frequencies per prop
    const counts = new Map();
    const orig = CSSStyleDeclaration.prototype.getPropertyValue;
    CSSStyleDeclaration.prototype.getPropertyValue = function (p) {
      counts.set(p, (counts.get(p) ?? 0) + 1);
      return orig.call(this, p);
    };
    return FastHtmlToImage.captureNode(document.documentElement).then(() => {
      CSSStyleDeclaration.prototype.getPropertyValue = orig;
      return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
    });
  });
  console.log(fx, JSON.stringify(lane));
}
await browser.close();
