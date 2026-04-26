import module from "node:module";
import { defineConfig } from "vite-plus";

const nodeBuiltins = [
  ...module.builtinModules,
  ...module.builtinModules.map((name) => `node:${name}`),
];

export default defineConfig({
  test: {
    globals: true,
    include: ["test/**/*.test.ts"],
    testTimeout: 10000,
  },
  pack: {
    entry: ["src/cli.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    sourcemap: false,
    platform: "node",
    fixedExtension: false,
    banner: "#!/usr/bin/env node",
    deps: {
      alwaysBundle: [/.*/],
      neverBundle: nodeBuiltins,
    },
  },
});
