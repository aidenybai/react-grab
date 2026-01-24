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

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`${provider} server terminated by signal ${signal}`);
    } else if (code !== 0) {
      console.error(`${provider} server crashed with exit code ${code}`);
    } else {
      console.log(`${provider} server exited`);
    }
  });

  return child;
};

const children = PROVIDERS_WITH_SERVERS.map(startServer);

const waitForChildrenToExit = () => {
  const aliveChildren = children.filter(
    (child) => child.exitCode === null && child.signalCode === null,
  );
  if (aliveChildren.length === 0) {
    process.exit(0);
  }

  return Promise.all(
    aliveChildren.map(
      (child) =>
        new Promise((resolve) => {
          child.on("exit", resolve);
        }),
    ),
  ).then(() => process.exit(0));
};

process.on("SIGINT", () => {
  console.log("\nShutting down all servers...");
  children.forEach((child) => child.kill("SIGINT"));
  waitForChildrenToExit();
});

process.on("SIGTERM", () => {
  children.forEach((child) => child.kill("SIGTERM"));
  waitForChildrenToExit();
});
