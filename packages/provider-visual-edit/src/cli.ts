#!/usr/bin/env node
import pc from "picocolors";

const VERSION = process.env.VERSION ?? "0.0.0";

console.log(
  `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(Visual Edit)")}`,
);
