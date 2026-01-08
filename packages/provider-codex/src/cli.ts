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
  throw error;
});
