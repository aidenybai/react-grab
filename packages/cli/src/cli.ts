import { Command } from "commander";
import tab from "@bomb.sh/tab/commander";
import { add } from "./commands/add.js";
import { browser } from "./commands/browser.js";
import { configure } from "./commands/configure.js";
import { init } from "./commands/init.js";
import { remove } from "./commands/remove.js";
import { update } from "./commands/update.js";
import { AGENTS, MCP_CLIENTS } from "./utils/templates.js";

const VERSION = process.env.VERSION ?? "0.0.1";
const VERSION_API_URL = "https://www.react-grab.com/api/version";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

try {
  fetch(`${VERSION_API_URL}?source=cli&t=${Date.now()}`).catch(() => {});
} catch {}

const program = new Command()
  .name("grab")
  .description("add React Grab to your project")
  .version(VERSION, "-v, --version", "display the version number");

program.addCommand(init);
program.addCommand(add);
program.addCommand(remove);
program.addCommand(configure);
program.addCommand(browser);
program.addCommand(update);

const completion = tab(program);

const initCommand = completion.commands.get("init");
const initAgentOption = initCommand?.options.get("agent");
if (initAgentOption) {
  initAgentOption.handler = (complete) => {
    for (const agent of AGENTS) {
      complete(agent, "");
    }
  };
}
const initKeyOption = initCommand?.options.get("key");
if (initKeyOption) {
  initKeyOption.handler = (complete) => {
    complete("Meta+K", "Cmd+K / Win+K");
    complete("Ctrl+K", "Ctrl+K");
    complete("Space", "Spacebar");
    complete("Alt", "Option / Alt");
  };
}

const addCommand = completion.commands.get("add");
const addAgentArg = addCommand?.arguments.get("agent");
if (addAgentArg) {
  addAgentArg.handler = (complete) => {
    complete("skill", "Instructions for your agent to use the browser (recommended)");
    complete("mcp", "A server that provides browser tools to your agent");
    for (const agent of AGENTS) {
      complete(agent, "");
    }
  };
}
const addClientOption = addCommand?.options.get("client");
if (addClientOption) {
  addClientOption.handler = (complete) => {
    for (const client of MCP_CLIENTS) {
      complete(client, "");
    }
  };
}

const removeCommand = completion.commands.get("remove");
const removeAgentArg = removeCommand?.arguments.get("agent");
if (removeAgentArg) {
  removeAgentArg.handler = (complete) => {
    for (const agent of AGENTS) {
      complete(agent, "");
    }
  };
}

const configureCommand = completion.commands.get("configure");
const configureKeyOption = configureCommand?.options.get("key");
if (configureKeyOption) {
  configureKeyOption.handler = (complete) => {
    complete("Meta+K", "Cmd+K / Win+K");
    complete("Ctrl+K", "Ctrl+K");
    complete("Space", "Spacebar");
    complete("Alt", "Option / Alt");
    complete("Ctrl+Shift+G", "Ctrl+Shift+G");
  };
}
const configureModeOption = configureCommand?.options.get("mode");
if (configureModeOption) {
  configureModeOption.handler = (complete) => {
    complete("toggle", "Press to activate/deactivate");
    complete("hold", "Hold key to keep active");
  };
}

program.parse();
