import { Command } from "commander";
import { execSync } from "node:child_process";

export const uninstall = new Command()
  .name("uninstall")
  .description("uninstall React Grab CLI globally")
  .action(() => {
    console.log("Uninstalling React Grab CLI...");
    try {
      execSync("npm uninstall -g grab", { stdio: "inherit" });
      console.log("React Grab CLI has been uninstalled.");
    } catch {
      console.error("Failed to uninstall. Please try: npm uninstall -g grab");
      process.exit(1);
    }
  });
