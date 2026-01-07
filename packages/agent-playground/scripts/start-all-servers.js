#!/usr/bin/env node
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagesDir = join(__dirname, "../..");

const PROVIDERS_WITH_SERVERS = [
  "provider-cursor",
  "provider-claude-code",
  "provider-opencode",
  "provider-codex",
  "provider-gemini",
  "provider-amp",
  "provider-droid",
  "provider-visual-edit",
];

const startServer = (provider) => {
  const cliPath = join(packagesDir, provider, "dist", "cli.cjs");
  const cwd = join(packagesDir, "..");

  console.log(`Starting ${provider} server...`);

  const child = spawn("node", [cliPath], {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      REACT_GRAB_CWD: cwd,
    },
  });

  child.on("error", (error) => {
    console.error(`Failed to start ${provider}:`, error.message);
  });

  return child;
};

const children = PROVIDERS_WITH_SERVERS.map(startServer);

process.on("SIGINT", () => {
  console.log("\nShutting down all servers...");
  children.forEach((child) => child.kill("SIGINT"));
  process.exit(0);
});

process.on("SIGTERM", () => {
  children.forEach((child) => child.kill("SIGTERM"));
  process.exit(0);
});
