import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { REACT_GRAB_DEVELOPMENT_ALIASES } from "../e2e-react-grab-development-aliases.js";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  build: {
    sourcemap: false,
  },
  resolve: {
    alias: command === "serve" ? REACT_GRAB_DEVELOPMENT_ALIASES : {},
  },
}));
