import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "./src/index.ts",
      client: "./src/client.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: false,
    target: "node18",
    platform: "node",
    treeshake: true,
  },
]);
