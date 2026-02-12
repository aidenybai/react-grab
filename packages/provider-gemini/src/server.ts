#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { geminiAgentHandler } from "./handler.js";

const isSecureConnection = process.argv.includes("--secure");

fetch(
  `https://www.react-grab.com/api/version?source=gemini&t=${Date.now()}`,
).catch(() => {});

connectRelay({ handler: geminiAgentHandler, secure: isSecureConnection });
