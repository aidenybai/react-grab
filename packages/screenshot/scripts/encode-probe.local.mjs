import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
const result = await page.evaluate(async () => {
  const width = 2400;
  const height = 4800;
  const paint = (ctx) => {
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgb(${(i * 37) % 255},${(i * 91) % 255},${(i * 53) % 255})`;
      ctx.fillRect((i * 97) % width, (i * 211) % height, 400, 300);
    }
  };
  const time = async (options) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", options);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    paint(ctx);
    const runs = [];
    for (let i = 0; i < 7; i++) {
      const start = performance.now();
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      runs.push({ ms: performance.now() - start, bytes: blob.size });
    }
    runs.sort((a, b) => a.ms - b.ms);
    return runs[3];
  };
  return {
    defaultCtx: await time(undefined),
    opaqueCtx: await time({ alpha: false }),
    willReadFrequently: await time({ willReadFrequently: true }),
  };
});
console.log(JSON.stringify(result, null, 1));
await browser.close();
