import type { Plugin } from "vite";
import { defineConfig, transformWithOxc } from "vite";
import solid from "vite-plugin-solid";
import { openstory } from "openstory/plugin";

const REACT_FILE_PATTERN = /\.react\.tsx$/;

// The openstory CLI builds an inline vite config with its own optionless
// vite-plugin-solid instance, so the `exclude` passed to the solid() below
// does not stop that duplicate from compiling *.react.tsx files as Solid JSX
// (which crashes at runtime once React renders the result). Compiling the JSX
// with the React runtime here — before any solid plugin runs — leaves no JSX
// behind for either instance to transform.
const reactFileJsxPlugin = (): Plugin => ({
  name: "react-grab:react-file-jsx",
  enforce: "pre",
  transform(code, id) {
    const filename = id.replace(/\?.*$/, "");
    if (!REACT_FILE_PATTERN.test(filename)) return null;
    return transformWithOxc(code, filename, {
      jsx: { runtime: "automatic", importSource: "react" },
    });
  },
});

export default defineConfig({
  plugins: [
    reactFileJsxPlugin(),
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
