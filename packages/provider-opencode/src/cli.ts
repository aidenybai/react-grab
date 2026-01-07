#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { openCodeAgentHandler } from "./handler.js";

try {
  fetch(
    `https://www.react-grab.com/api/version?source=opencode&t=${Date.now()}`,
  ).catch(() => {});
} catch {}

connectRelay({ handler: openCodeAgentHandler });
