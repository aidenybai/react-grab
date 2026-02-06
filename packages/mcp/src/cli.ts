#!/usr/bin/env node
import { startMcpServer } from "./server.js";

startMcpServer({
  port: Number(process.env.PORT) || undefined,
  stdio: process.argv.includes("--stdio"),
});
