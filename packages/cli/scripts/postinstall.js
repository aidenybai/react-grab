#!/usr/bin/env node

import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const isLinux = process.platform === "linux";

console.log("");
console.log("Installing Chromium browser for react-grab...");

try {
  const require = createRequire(import.meta.url);
  const playwrightCorePath = require.resolve("playwright-core");
  const playwrightCli = join(dirname(playwrightCorePath), "cli.js");

  execSync(`"${process.execPath}" "${playwrightCli}" install chromium`, {
    stdio: "inherit",
  });

  console.log("✓ Chromium installed successfully");
} catch {
  console.log("⚠ Could not install Chromium automatically");
  console.log("");
  console.log("To install manually, run:");
  console.log("  npx react-grab browser install");
}

if (isLinux) {
  console.log("");
  console.log("If you see \"shared library\" errors when running, use:");
  console.log("  npx react-grab browser install --with-deps");
}

console.log("");
