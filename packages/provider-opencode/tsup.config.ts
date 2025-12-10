import fs from "node:fs";
import module from "node:module";
import { defineConfig } from "tsup";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  version: string;
};

export default defineConfig([
  {
    entry: {
      server: "./src/server.ts",
      cli: "./src/cli.ts",
    },
    format: ["cjs", "esm"],
    // HACK: Skip DTS for now due to cross-package type resolution issues
    dts: false,
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
    },
    format: ["cjs", "esm"],
    // HACK: Skip DTS for now
    dts: false,
    clean: false,
    splitting: false,
    sourcemap: false,
    target: "esnext",
    platform: "browser",
    treeshake: true,
    noExternal: ["@react-grab/utils"],
  },
  {
    entry: ["./src/client.ts"],
    format: ["iife"],
    globalName: "ReactGrabOpencode",
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
