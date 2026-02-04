#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { claudeAgentHandler } from "./handler.js";

fetch(
  `https://www.react-grab.com/api/version?source=claude-code&t=${Date.now()}`,
).catch(() => {});

connectRelay({ handler: claudeAgentHandler });
