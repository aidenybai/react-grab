import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  resolve: {
    alias: {
      "react-grab/core": path.resolve(__dirname, "../react-grab/dist/core.js"),
    },
  },
  optimizeDeps: {
    exclude: ["react-grab"],
  },
});
