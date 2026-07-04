import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
const result = await page.evaluate(async () => {
  const width = 2400;
  const height = 4800;
  const draw = (ctx) => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#345";
    ctx.fillRect(50, 50, 900, 900);
  };
  const timeFresh = () => {
    const start = performance.now();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext("2d"));
    canvas.getContext("2d").getImageData(0, 0, 1, 1);
    return performance.now() - start;
  };
  const sharedCanvas = document.createElement("canvas");
  sharedCanvas.width = width;
  sharedCanvas.height = height;
  const timeReused = () => {
    const start = performance.now();
    const ctx = sharedCanvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    draw(ctx);
    ctx.getImageData(0, 0, 1, 1);
    return performance.now() - start;
  };
  const freshRuns = [];
  const reusedRuns = [];
  for (let i = 0; i < 9; i++) {
    freshRuns.push(timeFresh());
    reusedRuns.push(timeReused());
  }
  freshRuns.sort((a, b) => a - b);
  reusedRuns.sort((a, b) => a - b);
  return { freshMedianMs: freshRuns[4], reusedMedianMs: reusedRuns[4] };
});
console.log(JSON.stringify(result));
await browser.close();
