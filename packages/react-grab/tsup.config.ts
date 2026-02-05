import { execSync } from "node:child_process";
import fs from "node:fs";
import { defineConfig, type Options } from "tsup";
// @ts-expect-error -- esbuild-plugin-babel is not typed
import babel from "esbuild-plugin-babel";

const getCommitHash = (): string => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
};

const getPackageVersion = (): string =>
  (JSON.parse(fs.readFileSync("package.json", "utf8")) as { version: string })
    .version;

const version =
  process.env.VERSION ??
  (process.env.VERCEL
    ? getCommitHash()
    : process.env.NODE_ENV === "production"
      ? getPackageVersion()
      : "[DEV]");

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
    VERSION: version,
  },
  external: [],
  format: [],
  loader: {
    ".css": "text",
  },
  minify: process.env.NODE_ENV === "production",
  noExternal: ["clsx", "tailwind-merge", "solid-js", "bippy"],
  onSuccess: process.env.COPY ? "pbcopy < ./dist/index.global.js" : undefined,
  outDir: "./dist",
  sourcemap: false,
  splitting: false,
  target: "esnext",
  treeshake: true,
};

const browserBuildConfig: Options = {
  ...DEFAULT_OPTIONS,
  entry: ["./src/index.ts"],
  env: {
    ...DEFAULT_OPTIONS.env,
    VERSION: version,
  },
  format: ["iife"],
  globalName: "globalThis.__REACT_GRAB_MODULE__",
  loader: {
    ".css": "text",
  },
  outDir: "./dist",
  platform: "browser",
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
};

const libraryBuildConfig: Options = {
  ...DEFAULT_OPTIONS,
  clean: false,
  entry: ["./src/index.ts", "./src/core/index.tsx"],
  format: ["cjs", "esm"],
  loader: {
    ".css": "text",
  },
  outDir: "./dist",
  platform: "neutral",
  splitting: true,
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
};

const reactBuildConfig: Options = {
  banner: {
    js: `"use client";\n${banner}`,
  },
  clean: false,
  dts: true,
  entry: ["./src/react.tsx"],
  env: {
    VERSION: version,
  },
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
  external: ["react"],
  format: ["cjs", "esm"],
  loader: {
    ".css": "text",
  },
  minify: false,
  noExternal: ["bippy", "solid-js", "clsx", "tailwind-merge"],
  outDir: "./dist",
  platform: "neutral",
  sourcemap: false,
  splitting: false,
  target: "esnext",
  treeshake: false,
};

export default defineConfig([
  browserBuildConfig,
  libraryBuildConfig,
  reactBuildConfig,
]);
