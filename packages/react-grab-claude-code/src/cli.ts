#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start server in detached mode so it runs independently
// Note: The server will continue running after this process exits
// Stop it manually with: pkill -f "@react-grab"
const serverPath = join(__dirname, "server.js");
spawn(process.execPath, [serverPath], {
  detached: true,
  stdio: "ignore",
}).unref();

console.log("[React Grab] Server starting on port 4567...");
