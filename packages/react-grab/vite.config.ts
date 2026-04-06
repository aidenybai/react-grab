import { execSync } from "node:child_process";
import fs from "node:fs";
import { defineConfig } from "vite-plus";
import { cssTextPlugin, solidBabelPlugin, solidWebBrowserPlugin } from "./solid-babel-plugin.js";

const getCommitHash = (): string => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
};

const getPackageVersion = (): string =>
  (JSON.parse(fs.readFileSync("package.json", "utf8")) as { version: string }).version;

const version =
  process.env.VERSION ??
  (process.env.VERCEL
    ? getCommitHash()
    : process.env.NODE_ENV === "production"
      ? getPackageVersion()
      : "[DEV]");

const licenseBanner = `/**
 * @license MIT
 *
 * Copyright (c) 2025 Aiden Bai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */`;

export default defineConfig({
  pack: [
    {
      entry: ["./src/index.ts"],
      format: ["iife"],
      globalName: "globalThis.__REACT_GRAB_MODULE__",
      dts: false,
      clean: false,
      platform: "browser",
      sourcemap: false,
      minify: process.env.NODE_ENV === "production",
      banner: licenseBanner,
      define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
        "process.env.VERSION": JSON.stringify(version),
      },
      deps: {
        alwaysBundle: ["clsx", /^solid-js/, /^bippy/],
      },
      plugins: [solidWebBrowserPlugin(), cssTextPlugin(), solidBabelPlugin()],
    },
    {
      entry: ["./src/index.ts", "./src/core/index.tsx", "./src/primitives.ts"],
      format: ["cjs", "esm"],
      dts: true,
      clean: false,
      platform: "neutral",
      sourcemap: false,
      minify: process.env.NODE_ENV === "production",
      banner: licenseBanner,
      define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
        "process.env.VERSION": JSON.stringify(version),
      },
      deps: {
        alwaysBundle: ["clsx", /^bippy/],
        neverBundle: [/^solid-js/],
      },
      plugins: [solidWebBrowserPlugin(), cssTextPlugin(), solidBabelPlugin()],
    },
  ],
});
