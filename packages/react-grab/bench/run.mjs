import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(__dirname, "event-listener-pattern.html"), "utf8");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

page.on("console", (message) => {
  if (message.type() !== "error") {
    process.stdout.write(message.text() + "\n");
  }
});

await page.setContent(html, { waitUntil: "load" });
await page.waitForFunction(() => window.__BENCH_DONE__ === true, undefined, {
  timeout: 600_000,
});

await browser.close();
