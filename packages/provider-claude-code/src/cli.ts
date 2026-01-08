#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { claudeAgentHandler } from "./handler.js";

try {
  fetch(
    `https://www.react-grab.com/api/version?source=claude-code&t=${Date.now()}`,
  ).catch(() => {});
} catch {}

(async () => {
  await connectRelay({ handler: claudeAgentHandler });
})().catch((error) => {
  console.error("Failed to connect to relay:", error instanceof Error ? error.message : error);
  process.exit(1);
});
