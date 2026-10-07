import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { REACT_GRAB_DEVELOPMENT_ALIASES } from "../e2e-react-grab-development-aliases.js";

export default defineConfig(({ command }) => ({
  build: {
    sourcemap: false,
  },
  plugins: [tanstackStart(), react()],
  resolve: {
    alias: command === "serve" ? REACT_GRAB_DEVELOPMENT_ALIASES : {},
  },
  server: {
    port: 5178,
    strictPort: true,
  },
}));
