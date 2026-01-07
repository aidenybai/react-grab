#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { amiAgentHandler } from "./handler.js";

try {
  fetch(
    `https://www.react-grab.com/api/version?source=ami&t=${Date.now()}`,
  ).catch(() => {});
} catch {}

connectRelay({ handler: amiAgentHandler });
