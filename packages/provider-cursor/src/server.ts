#!/usr/bin/env node
import { startProviderServer } from "@react-grab/relay";
import { cursorAgentHandler } from "./handler.js";

startProviderServer("cursor", cursorAgentHandler);
