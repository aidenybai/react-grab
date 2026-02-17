import fs from "node:fs";
import module from "node:module";
import { defineConfig } from "tsup";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  version: string;
};

export default defineConfig([
  {
    entry: {
      handler: "./src/handler.ts",
      cli: "./src/cli.ts",
      server: "./src/server.ts",
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
    external: [
      ...module.builtinModules,
      ...module.builtinModules.map((name) => `node:${name}`),
    ],
    env: {
      VERSION: process.env.VERSION ?? packageJson.version,
    },
  },
  {
    entry: {
      client: "./src/client.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    splitting: false,
    sourcemap: false,
    target: "esnext",
    platform: "browser",
    treeshake: true,
    noExternal: ["@react-grab/relay"],
  },
  {
    entry: ["./src/client.ts"],
    format: ["iife"],
    globalName: "ReactGrabCopilot",
    outExtension: () => ({ js: ".global.js" }),
    dts: false,
    clean: false,
    minify: process.env.NODE_ENV === "production",
    splitting: false,
    sourcemap: false,
    target: "esnext",
    platform: "browser",
    treeshake: true,
    noExternal: [/.*/],
  },
]);
