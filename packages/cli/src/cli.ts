import { Command } from "commander";
import { add } from "./commands/add.js";
import { init } from "./commands/init.js";

const VERSION = process.env.VERSION ?? "0.0.1";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

const program = new Command()
  .name("react-grab")
  .description("add React Grab to your project")
  .version(VERSION, "-v, --version", "display the version number");

program.addCommand(init);
program.addCommand(add);

program.parse();
