import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5179/70-stress.html", { waitUntil: "networkidle" });
console.log(
  await page.evaluate(() => {
    const all = [...document.querySelectorAll("*")];
    const svg = all.filter((e) => e.namespaceURI === "http://www.w3.org/2000/svg");
    const byTag = {};
    for (const e of svg) byTag[e.localName] = (byTag[e.localName] ?? 0) + 1;
    return JSON.stringify({ total: all.length, svg: svg.length, byTag });
  }),
);
await browser.close();
