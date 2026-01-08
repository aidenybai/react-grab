#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { cursorAgentHandler } from "./handler.js";

try {
  fetch(
    `https://www.react-grab.com/api/version?source=cursor&t=${Date.now()}`,
  ).catch(() => {});
} catch {}

(async () => {
  await connectRelay({ handler: cursorAgentHandler });
})();
