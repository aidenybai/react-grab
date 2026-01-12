import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["-y", "@react-grab/cli", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 0);
