#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { ampAgentHandler } from "./handler.js";

fetch(
  `https://www.react-grab.com/api/version?source=amp&t=${Date.now()}`,
).catch(() => {});

connectRelay({ handler: ampAgentHandler });
