import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
    sourcemap: false,
    platform: "node",
    fixedExtension: false,
  },
  test: {
    globals: true,
    include: ["test/**/*.test.ts"],
    testTimeout: 15000,
  },
});
