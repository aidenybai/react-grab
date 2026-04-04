import fs from "node:fs";
import { defineConfig } from "vite-plus";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  version: string;
};

export default defineConfig({
  pack: {
    entry: ["src/cli.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    sourcemap: false,
    platform: "node",
    fixedExtension: false,
    banner: "#!/usr/bin/env node",
    define: {
      "process.env.VERSION": JSON.stringify(process.env.VERSION ?? packageJson.version),
    },
    deps: {
      alwaysBundle: [/^zod/],
    },
  },
  test: {
    globals: true,
    include: ["test/**/*.test.ts"],
    testTimeout: 10000,
  },
});
