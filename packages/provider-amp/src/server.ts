#!/usr/bin/env node
import { startProviderServer } from "@react-grab/relay";
import { ampAgentHandler } from "./handler.js";

startProviderServer("amp", ampAgentHandler);
