import fs from "node:fs";
import { defineConfig, type Options } from "tsup";

const banner = `/**
 * @license MIT
 *
 * Copyright (c) 2025 Aiden Bai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */`;

const DEFAULT_OPTIONS: Options = {
  banner: {
    js: banner,
  },
  clean: true,
  dts: true,
  entry: [],
  env: {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    VERSION: (
      JSON.parse(fs.readFileSync("package.json", "utf8")) as { version: string }
    ).version,
  },
  external: [],
  format: [],
  loader: {
    ".css": "text",
  },
  minify: false,
  onSuccess: process.env.COPY ? "pbcopy < ./dist/index.global.js" : undefined,
  outDir: "./dist",
  platform: "browser",
  sourcemap: false,
  splitting: false,
  target: "esnext",
  treeshake: true,
};

export default defineConfig([
  // main entry as ESM and CJS for package consumers
  {
    ...DEFAULT_OPTIONS,
    entry: ["./src/index.ts"],
    format: ["esm", "cjs"],
    loader: {
      ".css": "text",
    },
    minify: process.env.NODE_ENV === "production",
    outDir: "./dist",
  },
  // IIFE global bundle for direct <script> usage
  {
    ...DEFAULT_OPTIONS,
    dts: false,
    entry: ["./src/index.ts"],
    format: ["iife"],
    globalName: "ReactGrab",
    loader: {
      ".css": "text",
    },
    minify: process.env.NODE_ENV === "production",
    outDir: "./dist",
  },
  // Vite plugin
  {
    ...DEFAULT_OPTIONS,
    entry: ["./src/index.ts"],
    format: ["cjs", "esm"],
    loader: {
      ".css": "text",
    },
    outDir: "./dist",
  },
  {
    ...DEFAULT_OPTIONS,
    dts: true,
    entry: ["./src/plugins/vite.ts"],
    format: ["esm", "cjs"],
    onSuccess: undefined,
    outDir: "./dist/plugins",
  },
]);
