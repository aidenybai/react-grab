import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const fixtureId = process.argv[2];
const dumpSvg = process.argv.includes("--svg");
const browser = await chromium.launch({
  args: [
    "--force-device-scale-factor=1",
    "--hide-scrollbars",
    "--disable-lcd-text",
    "--font-render-hinting=none",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:5179/${fixtureId}.html`);
await page.addStyleTag({
  content:
    "*{animation:none!important;transition:none!important;caret-color:transparent!important}",
});
await page.evaluate(() => document.fonts.ready);
await page.addScriptTag({
  path: "/Users/aidenybai/Developer/react-grab/packages/screenshot/dist/index.global.js",
});
const result = await page.evaluate(async (wantSvg) => {
  const target = document.querySelector("#target");
  const captureResult = await window.HtmlToImageFast.captureNode(target, {
    pixelRatio: 1,
    scale: 1,
  });
  const png = await captureResult.toPngDataUrl();
  const svg = wantSvg ? await captureResult.toSvgDataUrl() : "";
  return { png, svg: decodeURIComponent(svg.replace("data:image/svg+xml;charset=utf-8,", "")) };
}, dumpSvg);
writeFileSync(`/tmp/${fixtureId}-actual.png`, Buffer.from(result.png.split(",")[1], "base64"));
if (dumpSvg) writeFileSync(`/tmp/${fixtureId}.svg`, result.svg);
const expected = await page.locator("#target").screenshot({
  scale: "css",
  animations: "disabled",
  caret: "hide",
});
writeFileSync(`/tmp/${fixtureId}-expected.png`, expected);
await browser.close();
console.log("done", fixtureId);
