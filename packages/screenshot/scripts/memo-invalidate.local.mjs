import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const bundle = readFileSync(new URL("../dist/index.global.js", import.meta.url), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
await page.setContent(`<!doctype html><html><head><style id="s">
.card { color: rgb(10, 20, 30); background: rgb(200, 200, 200); width: 120px; height: 40px; }
</style></head><body>
<div class="card">one</div><div class="unique" style="font-weight:bold">two</div>
</body></html>`);
await page.addScriptTag({ content: bundle });
const result = await page.evaluate(async () => {
  const capture = async () => {
    const r = await window.FastHtmlToImage.captureNode(document.body, { pixelRatio: 1 });
    const c = await r.toCanvas();
    return c.getContext("2d").getImageData(10, 10, 1, 1).data.join(",");
  };
  const first = await capture();
  const again = await capture();
  document.getElementById("s").textContent = document
    .getElementById("s")
    .textContent.replace("rgb(200, 200, 200)", "rgb(255, 0, 0)");
  const afterStyleEdit = await capture();
  return { first, again, afterStyleEdit };
});
console.log(JSON.stringify(result));
const pass = result.first === result.again && result.afterStyleEdit !== result.first;
console.log(pass ? "PASS" : "FAIL");
await browser.close();
process.exit(pass ? 0 : 1);
