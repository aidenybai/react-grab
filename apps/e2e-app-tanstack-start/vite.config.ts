import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: false,
  },
  plugins: [tanstackStart(), react()],
  server: {
    port: 5178,
    strictPort: true,
  },
});
