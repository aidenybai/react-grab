#!/usr/bin/env node
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverPath = join(__dirname, "server.js");

spawn(process.execPath, [serverPath], {
  detached: true,
  stdio: "ignore",
}).unref();

console.log("[React Grab] Server starting on port 6567...");