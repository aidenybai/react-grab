import { execSync } from "node:child_process";
import fs from "node:fs";
import { defineConfig } from "vite-plus";
import type { PackUserConfig } from "vite-plus/pack";
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

// process.env.IS_DEMO is a build-time constant. The library entries compile it
// to "" (falsey) so every demo-only branch is dead-code-eliminated; the demo
// entries compile it to "true" so the same source becomes a display-only build.
const createDefine = (isDemo: boolean) => ({
  "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
  "process.env.VERSION": JSON.stringify(version),
  "process.env.IS_DEMO": JSON.stringify(isDemo ? "true" : ""),
});

const alwaysBundle = ["clsx", /^solid-js/, /^bippy/];

// Fresh plugin instances per pack; the two shapes (browser IIFE global, neutral
// cjs/esm module) share everything except entry/format/output, so they're built
// from these factories to avoid lockstep edits across the four packs.
const makeIifePack = (entry: string, globalName: string, isDemo: boolean): PackUserConfig => ({
  entry: [entry],
  format: ["iife"],
  globalName,
  dts: false,
  clean: false,
  platform: "browser",
  sourcemap: false,
  minify: process.env.NODE_ENV === "production",
  banner: licenseBanner,
  outputOptions: {
    entryFileNames: "[name].global.js",
  },
  define: createDefine(isDemo),
  deps: { alwaysBundle },
  plugins: [solidWebBrowserPlugin(), cssTextPlugin(), solidBabelPlugin()],
});

const makeModulePack = (entry: string[], isDemo: boolean): PackUserConfig => ({
  entry,
  format: ["cjs", "esm"],
  dts: true,
  clean: false,
  platform: "neutral",
  sourcemap: process.env.REACT_GRAB_SOURCEMAP === "true",
  minify: process.env.NODE_ENV === "production" && process.env.REACT_GRAB_NO_MINIFY !== "true",
  banner: licenseBanner,
  define: createDefine(isDemo),
  deps: { alwaysBundle },
  plugins: [solidWebBrowserPlugin(), cssTextPlugin(), solidBabelPlugin()],
});

// The demo build is opt-in: `IS_DEMO=true` (via `pnpm build:demo`) emits the
// extra display-only `demo.*` bundles alongside the library so the default
// package stays lean.
const includeDemoBuild = process.env.IS_DEMO === "true";

export default defineConfig({
  pack: [
    makeIifePack("./src/index.ts", "globalThis.__REACT_GRAB_MODULE__", false),
    makeModulePack(["./src/index.ts", "./src/core/index.tsx", "./src/primitives.ts"], false),
    ...(includeDemoBuild
      ? [
          makeIifePack("./src/demo.ts", "globalThis.__REACT_GRAB_DEMO_MODULE__", true),
          makeModulePack(["./src/demo.ts"], true),
        ]
      : []),
  ],
});
