#!/usr/bin/env node
import { startProviderServer } from "@react-grab/relay";
import { openCodeAgentHandler } from "./handler.js";

startProviderServer("opencode", openCodeAgentHandler);
