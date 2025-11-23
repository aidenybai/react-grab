import fs from "node:fs";
import { defineConfig, type Options } from "tsup";
// @ts-expect-error -- esbuild-plugin-babel is not typed
import babel from "esbuild-plugin-babel";

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
  clean: ["**/*", "!styles.css"],
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
  noExternal: ["clsx", "tailwind-merge", "solid-js", "bippy"],
  onSuccess: process.env.COPY ? "pbcopy < ./dist/index.global.js" : undefined,
  outDir: "./dist",
  platform: "browser",
  sourcemap: false,
  splitting: false,
  target: "esnext",
  treeshake: true,
};

export default defineConfig([
  {
    ...DEFAULT_OPTIONS,
    entry: ["./src/index.ts"],
    format: ["iife"],
    globalName: "ReactGrab",
    loader: {
      ".css": "text",
    },
    minify: process.env.NODE_ENV === "production",
    outDir: "./dist",
    esbuildPlugins: [
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- babel is not typed
      babel({
        filter: /\.(tsx|jsx)$/,
        config: {
          presets: [
            ["@babel/preset-typescript", { onlyRemoveTypeImports: true }],
            "babel-preset-solid",
          ],
        },
      }),
    ],
  },
  {
    ...DEFAULT_OPTIONS,
    entry: ["./src/index.ts"],
    format: ["cjs", "esm"],
    loader: {
      ".css": "text",
    },
    outDir: "./dist",
    esbuildPlugins: [
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- babel is not typed
      babel({
        filter: /\.(tsx|jsx)$/,
        config: {
          presets: [
            ["@babel/preset-typescript", { onlyRemoveTypeImports: true }],
            "babel-preset-solid",
          ],
        },
      }),
    ],
  },
]);
