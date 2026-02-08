#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { codexAgentHandler } from "./handler.js";

const isSecureConnection = process.argv.includes("--secure");

fetch(
  `https://www.react-grab.com/api/version?source=codex&t=${Date.now()}`,
).catch(() => {});

connectRelay({ handler: codexAgentHandler, secure: isSecureConnection });
