#!/usr/bin/env node
import { join } from "node:path";
import { execa } from "execa";
import pc from "picocolors";
import { DEFAULT_PORT } from "./constants.js";

declare const __dirname: string;

const VERSION = process.env.VERSION ?? "0.0.0";

const serverPath = join(__dirname, "server.cjs");
execa(process.execPath, [serverPath], {
  detached: true,
  stdio: "ignore",
  cleanup: false,
}).unref();

console.log(
  `${pc.magenta("⚛")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(OpenCode)")}`,
);
console.log(`- Local:    ${pc.cyan(`http://localhost:${DEFAULT_PORT}`)}`);
