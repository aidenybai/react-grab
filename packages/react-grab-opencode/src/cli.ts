#!/usr/bin/env node
import { startServer } from "./server.js";

startServer().catch(console.error);
