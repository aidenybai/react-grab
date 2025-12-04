import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "serve-workspace-dist",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith("/@react-grab/")) {
            const filePath = path.join(__dirname, "../react-grab/dist", req.url.replace("/@react-grab/", ""));
            if (fs.existsSync(filePath)) {
              res.setHeader("Content-Type", "application/javascript");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          if (req.url?.startsWith("/@react-grab-claude-code/")) {
            const filePath = path.join(__dirname, "../react-grab-claude-code/dist", req.url.replace("/@react-grab-claude-code/", ""));
            if (fs.existsSync(filePath)) {
              res.setHeader("Content-Type", "application/javascript");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          if (req.url?.startsWith("/@react-grab-cursor/")) {
            const filePath = path.join(__dirname, "../react-grab-cursor/dist", req.url.replace("/@react-grab-cursor/", ""));
            if (fs.existsSync(filePath)) {
              res.setHeader("Content-Type", "application/javascript");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 5174,
  },
  root: path.resolve(__dirname, "app"),
});
