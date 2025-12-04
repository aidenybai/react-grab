#!/usr/bin/env node
import { startServer } from "./server.js";

// Start the server directly
// This keeps the process running so the server stays alive
startServer().catch(console.error);
