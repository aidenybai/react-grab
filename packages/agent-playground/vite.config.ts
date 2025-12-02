import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

import "@react-grab/claude-code/server";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  root: path.resolve(__dirname, "app"),
  resolve: {
    alias: {
      "react-grab/core": path.resolve(__dirname, "../react-grab/dist/core.js"),
    },
  },
  optimizeDeps: {
    exclude: ["react-grab"],
  },
});
