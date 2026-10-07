import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { openstory } from "openstory/plugin";
import { solidSourceLocationBabelPlugin } from "../../packages/react-grab/solid-source-location-babel-plugin.js";

const REACT_FILE_PATTERN = /\.react\.tsx$/;

export default defineConfig(({ command }) => ({
  plugins: [
    solid({
      exclude: [REACT_FILE_PATTERN],
      babel:
        command === "serve"
          ? {
              plugins: [solidSourceLocationBabelPlugin],
            }
          : undefined,
    }),
    openstory({ framework: "solid" }),
  ],
  resolve: {
    alias: {
      "@react-grab-source": fileURLToPath(
        new URL("../../packages/react-grab/src", import.meta.url),
      ),
    },
    dedupe: ["solid-js", "solid-js/web"],
  },
  define: {
    "process.env.VERSION": JSON.stringify("[DEV]"),
    // react-grab source reads this at module scope (utils/runtime-mode.ts);
    // without a define, the bare `process` access throws in the browser.
    "process.env.IS_DEMO": JSON.stringify(""),
    "process.env.REACT_GRAB_SOURCE_LOCATIONS": JSON.stringify(command === "serve" ? "true" : ""),
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
}));
