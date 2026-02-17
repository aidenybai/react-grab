#!/usr/bin/env node
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";

const realScriptPath = realpathSync(process.argv[1]);
const scriptDir = dirname(realScriptPath);
const serverPath = join(scriptDir, "server.cjs");

const child = spawn(
  process.execPath,
  ["-e", `require(${JSON.stringify(serverPath)}).startServer()`],
  {
    detached: true,
    stdio: "inherit",
  },
);

child.unref();
process.exit(0);
