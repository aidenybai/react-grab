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
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
});
