import module from "node:module";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    cli: "./src/cli.ts",
  },
  format: ["cjs"],
  dts: false,
  clean: true,
  splitting: false,
  sourcemap: false,
  target: "node18",
  platform: "node",
  treeshake: true,
  external: [...module.builtinModules, "@crosscopy/clipboard"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
