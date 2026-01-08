#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { geminiAgentHandler } from "./handler.js";

try {
  fetch(
    `https://www.react-grab.com/api/version?source=gemini&t=${Date.now()}`,
  ).catch(() => {});
} catch {}

(async () => {
  await connectRelay({ handler: geminiAgentHandler });
})().catch((error) => {
  throw error;
});
