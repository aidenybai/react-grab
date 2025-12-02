import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      client: "./src/client.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: false,
    target: "esnext",
    platform: "browser",
    noExternal: [/.*/],
    treeshake: true,
  },
]);
