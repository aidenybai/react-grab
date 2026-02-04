#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { openCodeAgentHandler } from "./handler.js";

fetch(
  `https://www.react-grab.com/api/version?source=opencode&t=${Date.now()}`,
).catch(() => {});

connectRelay({ handler: openCodeAgentHandler });
