#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { codexAgentHandler } from "./handler.js";

try {
  fetch(
    `https://www.react-grab.com/api/version?source=codex&t=${Date.now()}`,
  ).catch(() => {});
} catch {}

connectRelay({ handler: codexAgentHandler });
