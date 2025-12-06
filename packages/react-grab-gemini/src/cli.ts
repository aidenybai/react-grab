#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { DEFAULT_PORT } from "./constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, "server.js");

// Dynamically import and run server directly to get startup feedback
import(serverPath).then(async (mod) => {
  const started = await mod.startServer(DEFAULT_PORT);
  if (!started) {
    // Server already running on this port, exit silently
    process.exit(0);
  }
});
