import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const PROVIDER = process.env.VITE_PROVIDER ?? "claude";

console.log("PROVIDER", PROVIDER);

const loadProvider = async () => {
  if (PROVIDER === "ami") {
    return null;
  } else if (PROVIDER === "cursor") {
    return await import("@react-grab/cursor/server");
  } else if (PROVIDER === "claude") {
    return await import("@react-grab/claude-code/server");
  }
  throw new Error(`Unknown provider: ${PROVIDER}`);
};

const provider = await loadProvider();

if (provider) {
  provider.startServer();
}

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
