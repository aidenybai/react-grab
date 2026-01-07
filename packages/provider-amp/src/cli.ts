#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { ampAgentHandler } from "./handler.js";

try {
  fetch(
    `https://www.react-grab.com/api/version?source=amp&t=${Date.now()}`,
  ).catch(() => {});
} catch {}

connectRelay({ handler: ampAgentHandler });
