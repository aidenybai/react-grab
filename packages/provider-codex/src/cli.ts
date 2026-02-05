#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnDetachedServer } from "@react-grab/utils/server";

const realScriptPath = realpathSync(process.argv[1]);
const scriptDir = dirname(realScriptPath);
const serverPath = join(scriptDir, "server.cjs");

spawnDetachedServer(serverPath);
