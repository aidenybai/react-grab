import module from "node:module";
import { defineConfig } from "vite-plus";

const nodeBuiltins = [
  ...module.builtinModules,
  ...module.builtinModules.map((name) => `node:${name}`),
];

export default defineConfig({
  pack: [
    {
      entry: ["src/client.ts"],
      format: ["cjs", "esm"],
      dts: true,
      clean: false,
      sourcemap: false,
      platform: "browser",
    },
    {
      entry: ["src/client.ts"],
      format: ["iife"],
      globalName: "ReactGrabMcp",
      dts: false,
      clean: false,
      minify: process.env.NODE_ENV === "production",
      sourcemap: false,
      platform: "browser",
      deps: {
        alwaysBundle: [/.*/],
      },
    },
    {
      entry: ["src/server.ts", "src/cli.ts"],
      format: ["cjs", "esm"],
      dts: true,
      clean: false,
      sourcemap: false,
      platform: "node",
      fixedExtension: false,
      deps: {
        alwaysBundle: [/.*/],
        neverBundle: nodeBuiltins,
      },
    },
  ],
});
