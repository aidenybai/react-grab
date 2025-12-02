import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      client: "./src/client.ts",
      server: "./src/server.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: false,
    target: "node18",
    platform: "node",
    treeshake: true,
    noExternal: [/.*/],
  },
]);
