import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";

const reactGrabPath = path.resolve(__dirname, "../react-grab");

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: "./src/manifest.json",
      watchFilePaths: ["src/**/*", "../react-grab/dist/**/*"],
      browser: "chrome",
    }),
  ],
  resolve: {
    alias: {
      "@": "/src",
      "react-grab/core": path.join(reactGrabPath, "dist/core/index.js"),
      "react-grab": path.join(reactGrabPath, "dist/index.js"),
    },
  },
  optimizeDeps: {
    include: ["turndown"],
  },
  build: {
    commonjsOptions: {
      include: [/turndown/, /node_modules/],
    },
  },
  publicDir: "public",
});
