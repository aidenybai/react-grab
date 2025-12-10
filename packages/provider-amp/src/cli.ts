#!/usr/bin/env node
import { join } from "node:path";
import spawn from "cross-spawn";
import pc from "picocolors";
import { DEFAULT_PORT } from "./constants.js";

declare const __dirname: string;

const VERSION = process.env.VERSION ?? "0.0.0";

const serverPath = join(__dirname, "server.js");
spawn(process.execPath, [serverPath], {
  detached: true,
  stdio: "ignore",
}).unref();

console.log(`${pc.magenta("⚛")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(Amp)")}`);
console.log(`- Local:    ${pc.cyan(`http://localhost:${DEFAULT_PORT}`)}`);
