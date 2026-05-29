import { defineConfig } from "vite-plus";

// Builds the first-party TS watcher (src/watch.ts) into the installable payload at
// skills/react-grab/scripts/watch.mjs. clean:false keeps the sibling native readers
// (read-clipboard.swift/.ps1) in that directory.
export default defineConfig({
  pack: {
    entry: ["src/watch.ts"],
    format: ["esm"],
    outDir: "../../skills/react-grab/scripts",
    fixedExtension: true,
    dts: false,
    clean: false,
    sourcemap: false,
    platform: "node",
    banner:
      "#!/usr/bin/env node\n// Generated from src/watch.ts via `vp pack` — edit the TS source.",
  },
});
