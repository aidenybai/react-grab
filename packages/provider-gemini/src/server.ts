#!/usr/bin/env node
import { startProviderServer } from "@react-grab/relay";
import { geminiAgentHandler } from "./handler.js";

startProviderServer("gemini", geminiAgentHandler);
