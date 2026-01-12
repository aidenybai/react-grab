import { spawnSync } from "node:child_process";

const version = process.env.VERSION ?? "latest";

const result = spawnSync(
  "npx",
  ["-y", `@react-grab/cli@${version}`, ...process.argv.slice(2)],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

process.exit(result.status ?? 0);
