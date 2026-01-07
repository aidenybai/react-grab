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
            const filePath = path.join(
              __dirname,
              "../react-grab/dist",
              req.url.replace("/@react-grab/", ""),
            );
            if (fs.existsSync(filePath)) {
              res.setHeader("Content-Type", "application/javascript");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          if (req.url?.startsWith("/@provider-claude-code/")) {
            const filePath = path.join(
              __dirname,
              "../provider-claude-code/dist",
              req.url.replace("/@provider-claude-code/", ""),
            );
            if (fs.existsSync(filePath)) {
              res.setHeader("Content-Type", "application/javascript");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          if (req.url?.startsWith("/@provider-cursor/")) {
            const filePath = path.join(
              __dirname,
              "../provider-cursor/dist",
              req.url.replace("/@provider-cursor/", ""),
            );
            if (fs.existsSync(filePath)) {
              res.setHeader("Content-Type", "application/javascript");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          if (req.url?.startsWith("/@provider-opencode/")) {
            const filePath = path.join(
              __dirname,
              "../provider-opencode/dist",
              req.url.replace("/@provider-opencode/", ""),
            );
            if (fs.existsSync(filePath)) {
              res.setHeader("Content-Type", "application/javascript");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          if (req.url?.startsWith("/@provider-ami/")) {
            const filePath = path.join(
              __dirname,
              "../provider-ami/dist",
              req.url.replace("/@provider-ami/", ""),
            );
            if (fs.existsSync(filePath)) {
              res.setHeader("Content-Type", "application/javascript");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          if (req.url?.startsWith("/@provider-codex/")) {
            const filePath = path.join(
              __dirname,
              "../provider-codex/dist",
              req.url.replace("/@provider-codex/", ""),
            );
            if (fs.existsSync(filePath)) {
              res.setHeader("Content-Type", "application/javascript");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          if (req.url?.startsWith("/@provider-gemini/")) {
            const filePath = path.join(
              __dirname,
              "../provider-gemini/dist",
              req.url.replace("/@provider-gemini/", ""),
            );
            if (fs.existsSync(filePath)) {
              res.setHeader("Content-Type", "application/javascript");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          if (req.url?.startsWith("/@provider-amp/")) {
            const filePath = path.join(
              __dirname,
              "../provider-amp/dist",
              req.url.replace("/@provider-amp/", ""),
            );
            if (fs.existsSync(filePath)) {
              res.setHeader("Content-Type", "application/javascript");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          if (req.url?.startsWith("/@provider-droid/")) {
            const filePath = path.join(
              __dirname,
              "../provider-droid/dist",
              req.url.replace("/@provider-droid/", ""),
            );
            if (fs.existsSync(filePath)) {
              res.setHeader("Content-Type", "application/javascript");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          if (req.url?.startsWith("/@provider-visual-edit/")) {
            const filePath = path.join(
              __dirname,
              "../provider-visual-edit/dist",
              req.url.replace("/@provider-visual-edit/", ""),
            );
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
