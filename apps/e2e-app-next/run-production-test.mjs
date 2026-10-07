import { spawnSync } from "node:child_process";
import { copyFileSync } from "node:fs";
import { createRequire } from "node:module";

const [mode, ...nextArguments] = process.argv.slice(2);
const environment = {
  ...process.env,
  NEXT_DIST_DIR: ".next-production",
};

if (mode === "build") {
  copyFileSync("tsconfig.json", ".tsconfig-production-test.json");
  environment.NEXT_TSCONFIG_PATH = ".tsconfig-production-test.json";
}

const require = createRequire(import.meta.url);
const nextCliPath = require.resolve("next/dist/bin/next");
const result = spawnSync(process.execPath, [nextCliPath, ...nextArguments], {
  env: environment,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
