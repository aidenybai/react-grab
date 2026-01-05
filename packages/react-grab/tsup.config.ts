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

const isVercel = Boolean(process.env.VERCEL);

const version =
  process.env.VERSION ??
  (isVercel
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

export default defineConfig([
  {
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
  },
  {
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
  },
  {
    ...DEFAULT_OPTIONS,
    banner: undefined,
    clean: false,
    dts: false,
    entry: { cli: "./src/cli.ts" },
    format: ["cjs"],
    noExternal: [
      /@react-grab\/cli/,
      "commander",
      "kleur",
      "ora",
      "prompts",
      "@antfu/ni",
    ],
    outDir: "./dist",
    platform: "node",
    splitting: false,
    esbuildOptions(options) {
      options.banner = {
        js: "#!/usr/bin/env node",
      };
      options.alias = {
        "@react-grab/cli": "../cli/src/cli.ts",
      };
    },
  },
]);
