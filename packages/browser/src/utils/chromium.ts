import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
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

export const installChromium = (withDeps = false): void => {
  if (withDeps && process.platform === "linux") {
    try {
      execSync("npx -y playwright install-deps chromium", {
        stdio: "inherit",
      });
    } catch {
      console.log(
        "Warning: Could not install system dependencies (may need sudo)",
      );
    }
  }

  execSync("npx -y playwright install chromium", {
    stdio: "inherit",
  });

  isChromiumInstalled = true;
};

export const ensureChromiumInstalled = (): void => {
  if (!checkChromiumInstalled()) {
    console.log("");
    console.log("Chromium not found. Installing...");
    const isLinux = process.platform === "linux";
    installChromium(isLinux);
    console.log("✓ Chromium installed successfully");
    console.log("");
  }
};
