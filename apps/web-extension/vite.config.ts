import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";

export default defineConfig({
  plugins: [
    webExtension({
      manifest: "./src/manifest.json",
      watchFilePaths: ["src/**/*"],
      browser: "chrome",
    }),
  ],
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
