import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Copies the native clipboard readers next to the compiled CLI so `react-grab
// watch` can locate and compile them at runtime. Runs AFTER `vp pack` because
// the packer cleans dist/ on each build.
const here = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(here, "..", "assets");
const distDir = path.join(here, "..", "dist");
const READERS = ["read-clipboard.swift", "read-clipboard.ps1"];

mkdirSync(distDir, { recursive: true });
for (const reader of READERS) {
  copyFileSync(path.join(assetsDir, reader), path.join(distDir, reader));
}
