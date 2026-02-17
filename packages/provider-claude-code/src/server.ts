#!/usr/bin/env node
import { startProviderServer } from "@react-grab/relay";
import { claudeAgentHandler } from "./handler.js";

startProviderServer("claude-code", claudeAgentHandler);
