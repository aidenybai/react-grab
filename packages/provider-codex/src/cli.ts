#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { codexAgentHandler } from "./handler.js";

try {
  fetch(
    `https://www.react-grab.com/api/version?source=codex&t=${Date.now()}`,
  ).catch(() => {});
} catch {}

(async () => {
  await connectRelay({ handler: codexAgentHandler });
})().catch((error) => {
  console.error("Failed to connect to relay:", error instanceof Error ? error.message : error);
  process.exit(1);
});
