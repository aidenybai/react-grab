#!/usr/bin/env node
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";

const scriptDir = dirname(process.argv[1]);
const serverPath = join(scriptDir, "server.cjs");

const child = spawn(process.execPath, [serverPath], {
  detached: true,
  stdio: "inherit",
});

child.unref();
process.exit(0);
