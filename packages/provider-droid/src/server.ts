#!/usr/bin/env node
import { connectRelay } from "@react-grab/relay";
import { droidAgentHandler } from "./handler.js";

const isSecureConnection = process.argv.includes("--secure");

fetch(
  `https://www.react-grab.com/api/version?source=droid&t=${Date.now()}`,
).catch(() => {});

connectRelay({ handler: droidAgentHandler, secure: isSecureConnection });
