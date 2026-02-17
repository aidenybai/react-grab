#!/usr/bin/env node
import { startProviderServer } from "@react-grab/relay";
import { droidAgentHandler } from "./handler.js";

startProviderServer("droid", droidAgentHandler);
