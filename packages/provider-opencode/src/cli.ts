#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { openCodeAgentHandler } from "./handler.js";

try {
  fetch(
    `https://www.react-grab.com/api/version?source=opencode&t=${Date.now()}`,
  ).catch(() => {});
} catch {}

(async () => {
  await connectRelay({ handler: openCodeAgentHandler });
})().catch((error) => {
  console.error("Failed to connect to relay:", error instanceof Error ? error.message : error);
  process.exit(1);
});
