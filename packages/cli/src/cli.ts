import { Command } from "commander";
import { add } from "./commands/add.js";
import { browser } from "./commands/browser.js";
import { configure } from "./commands/configure.js";
import { init } from "./commands/init.js";
import { remove } from "./commands/remove.js";
import { uninstall } from "./commands/uninstall.js";
import { update } from "./commands/update.js";

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
program.addCommand(uninstall);

program.parse();
