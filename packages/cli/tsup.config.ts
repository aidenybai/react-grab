import fs from "node:fs";
import { defineConfig } from "tsup";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  version: string;
};

export default defineConfig([
  {
    entry: {
      cli: "./src/cli.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: false,
    target: "node18",
    platform: "node",
    treeshake: true,
    env: {
      VERSION: process.env.VERSION ?? packageJson.version,
    },
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
