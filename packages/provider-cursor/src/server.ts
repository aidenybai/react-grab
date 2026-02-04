#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { cursorAgentHandler } from "./handler.js";

fetch(
  `https://www.react-grab.com/api/version?source=cursor&t=${Date.now()}`,
).catch(() => {});

connectRelay({ handler: cursorAgentHandler });
