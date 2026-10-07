import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { REACT_GRAB_DEVELOPMENT_ALIASES } from "../e2e-react-grab-development-aliases.js";

// Holds a request open for ?ms (default 30s) so the @perf source-fetch bench can
// saturate the browser's per-origin connection pool and make react-grab's source
// requests queue behind the app's own traffic. Aborts cleanly when the client
// disconnects so a finished test never leaves the dev server with stuck sockets.
const slowEndpointPlugin = (): Plugin => ({
  name: "e2e-slow-endpoint",
  configureServer(server) {
    server.middlewares.use("/__slow", (request, response) => {
      const delayMs = Number(new URL(request.url ?? "", "http://localhost").searchParams.get("ms"));
      const timer = setTimeout(
        () => response.end("done"),
        Number.isFinite(delayMs) && delayMs > 0 ? delayMs : 30_000,
      );
      request.on("close", () => clearTimeout(timer));
    });
  },
});

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), slowEndpointPlugin()],
  server: {
    port: 5175,
    strictPort: true,
  },
  resolve: {
    alias: {
      ...(command === "serve" ? REACT_GRAB_DEVELOPMENT_ALIASES : {}),
      "@": "/src",
    },
  },
}));
