import { defineConfig } from "vite-plus";
import type { PackUserConfig } from "vite-plus/pack";

const modulePack: PackUserConfig = {
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  platform: "browser",
  sourcemap: false,
  minify: process.env.NODE_ENV === "production",
  fixedExtension: false,
};

const iifePack: PackUserConfig = {
  entry: ["src/index.ts"],
  format: ["iife"],
  globalName: "HtmlToImageFast",
  dts: false,
  clean: false,
  platform: "browser",
  sourcemap: false,
  minify: process.env.NODE_ENV === "production",
  outputOptions: {
    entryFileNames: "[name].global.js",
  },
};

export default defineConfig({
  pack: [modulePack, iifePack],
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "happy-dom",
    testTimeout: 30_000,
    passWithNoTests: true,
  },
});
