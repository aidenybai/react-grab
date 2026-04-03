import { defineConfig } from "vite-plus";
import {
  cssTextPlugin,
  solidBabelPlugin,
  solidWebBrowserPlugin,
} from "../react-grab/solid-babel-plugin";

export default defineConfig({
  pack: {
    entry: ["src/index.tsx"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    platform: "browser",
    sourcemap: false,
    minify: process.env.NODE_ENV === "production",
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
    },
    deps: {
      alwaysBundle: [/^solid-js/, /^react-grab\/src/, "react-grab/dist/styles.css"],
    },
    plugins: [solidWebBrowserPlugin(), cssTextPlugin(), solidBabelPlugin()],
  },
});
