#!/usr/bin/env node
import { startProviderServer } from "@react-grab/relay";
import { codexAgentHandler } from "./handler.js";

startProviderServer("codex", codexAgentHandler);
