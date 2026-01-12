import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { chromium } from "playwright-core";

let isChromiumInstalled: boolean | null = null;

export const checkChromiumInstalled = (): boolean => {
  if (isChromiumInstalled !== null) {
    return isChromiumInstalled;
  }

  try {
    const executablePath = chromium.executablePath();
    isChromiumInstalled = existsSync(executablePath);
    return isChromiumInstalled;
  } catch {
    isChromiumInstalled = false;
    return false;
  }
};

export const installChromium = (): void => {
  const require = createRequire(import.meta.url);
  const playwrightCorePath = require.resolve("playwright-core");
  const playwrightCli = join(dirname(playwrightCorePath), "cli.js");

  execSync(`"${process.execPath}" "${playwrightCli}" install chromium`, {
    stdio: "inherit",
  });

  isChromiumInstalled = true;
};

export const ensureChromiumInstalled = (): void => {
  if (!checkChromiumInstalled()) {
    console.log("");
    console.log("Chromium not found. Installing...");
    installChromium();
    console.log("✓ Chromium installed successfully");
    console.log("");
  }
};
