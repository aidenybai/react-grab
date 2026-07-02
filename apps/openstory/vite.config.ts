import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { openstory } from "openstory/plugin";

const REACT_FILE_PATTERN = /\.react\.tsx$/;

export default defineConfig({
  plugins: [
    solid({
      exclude: [REACT_FILE_PATTERN],
    }),
    openstory({ framework: "solid" }),
  ],
  resolve: {
    dedupe: ["solid-js", "solid-js/web"],
  },
  define: {
    "process.env.VERSION": JSON.stringify("[DEV]"),
    // react-grab source reads this at module scope (utils/runtime-mode.ts);
    // without a define, the bare `process` access throws in the browser.
    "process.env.IS_DEMO": JSON.stringify(""),
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
});
