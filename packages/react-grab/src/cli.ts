import { spawn } from "node:child_process";

const child = spawn("npx", ["-y", "@react-grab/cli", ...process.argv.slice(2)], {
  stdio: "inherit",
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});
