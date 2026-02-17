import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
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
  },
]);
