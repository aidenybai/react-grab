import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/content.ts"],
    outDir: "dist",
    format: ["iife"],
    platform: "browser",
    target: "esnext",
    bundle: true,
    minify: process.env.NODE_ENV === "production",
    sourcemap: false,
    clean: true,
    noExternal: ["react-grab"],
    outExtension: () => ({ js: ".js" }),
  },
  {
    entry: ["src/background.ts"],
    outDir: "dist",
    format: ["iife"],
    platform: "browser",
    target: "esnext",
    bundle: true,
    minify: process.env.NODE_ENV === "production",
    sourcemap: false,
    clean: false,
    outExtension: () => ({ js: ".js" }),
  },
  {
    entry: ["src/popup/popup.ts"],
    outDir: "dist",
    format: ["iife"],
    platform: "browser",
    target: "esnext",
    bundle: true,
    minify: process.env.NODE_ENV === "production",
    sourcemap: false,
    clean: false,
    outExtension: () => ({ js: ".js" }),
    onSuccess: async () => {
      const fs = await import("fs/promises");
      const path = await import("path");

      await fs.copyFile("manifest.json", "dist/manifest.json");
      await fs.copyFile(
        "src/popup/popup.html",
        "dist/popup.html",
      );

      await fs.mkdir("dist/icons", { recursive: true });

      console.log("✓ Copied manifest.json and popup.html to dist/");
      console.log("⚠ Remember to add icon files to dist/icons/");
    },
  },
]);
