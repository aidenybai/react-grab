import fs from "node:fs";
import module from "node:module";
import { defineConfig } from "tsup";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  version: string;
};

export default defineConfig([
  {
    entry: {
      index: "./src/index.ts",
      server: "./src/server.ts",
      connection: "./src/connection.ts",
      protocol: "./src/protocol.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    splitting: false,
    sourcemap: false,
    target: "node18",
    platform: "node",
    treeshake: true,
    noExternal: [/.*/],
    external: module.builtinModules,
    env: {
      VERSION: process.env.VERSION ?? packageJson.version,
    },
  },
  {
    entry: {
      client: "./src/client.ts",
      protocol: "./src/protocol.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    splitting: false,
    sourcemap: false,
    target: "esnext",
    platform: "browser",
    treeshake: true,
  },
]);
