import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
