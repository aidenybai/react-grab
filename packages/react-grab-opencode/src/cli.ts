#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pc from "picocolors";
import { DEFAULT_PORT } from "./constants.js";

const VERSION = process.env.VERSION ?? "0.0.0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, "server.js");
spawn(process.execPath, [serverPath], {
  detached: true,
  stdio: "ignore",
}).unref();

console.log(`${pc.magenta("⚛")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`);
console.log(`- Local:    ${pc.cyan(`http://localhost:${DEFAULT_PORT}`)}`);
