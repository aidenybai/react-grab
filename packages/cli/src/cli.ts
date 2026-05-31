import { Command } from "commander";
import { add } from "./commands/add.js";
import { configure } from "./commands/configure.js";
import { init } from "./commands/init.js";
import { pull } from "./commands/pull.js";
import { remove } from "./commands/remove.js";
import { stop } from "./commands/stop.js";
import { upgrade } from "./commands/upgrade.js";
import { watch } from "./commands/watch.js";

const VERSION = process.env.VERSION ?? "0.0.1";
const VERSION_API_URL = "https://www.react-grab.com/api/version";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

try {
  fetch(`${VERSION_API_URL}?source=cli&v=${VERSION}&t=${Date.now()}`).catch(() => {});
} catch {}

const program = new Command()
  .name("grab")
  .description("add React Grab to your project")
  .version(VERSION, "-v, --version", "display the version number");

program.addCommand(init);
program.addCommand(add);
program.addCommand(remove);
program.addCommand(configure);
program.addCommand(upgrade);
program.addCommand(pull);
program.addCommand(stop);
program.addCommand(watch, { hidden: true });

const main = async () => {
  await program.parseAsync();
};

main();
