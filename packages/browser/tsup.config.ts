import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";
import type { Plugin } from "esbuild";

const REACT_GRAB_SCRIPT_PATH = join(
  __dirname,
  "../react-grab/dist/index.global.js",
);

const getReactGrabScript = (): string => {
  if (existsSync(REACT_GRAB_SCRIPT_PATH)) {
    return readFileSync(REACT_GRAB_SCRIPT_PATH, "utf-8");
  }
  return "";
};

const inlineReactGrabScriptPlugin = (): Plugin => ({
  name: "inline-react-grab-script",
  setup(build) {
    build.onResolve({ filter: /^__REACT_GRAB_SCRIPT__$/ }, () => ({
      path: "__REACT_GRAB_SCRIPT__",
      namespace: "react-grab-script",
    }));

    build.onLoad({ filter: /.*/, namespace: "react-grab-script" }, () => {
      const script = getReactGrabScript();
      return {
        contents: `export default ${JSON.stringify(script)};`,
        loader: "js",
      };
    });
  },
});

export default defineConfig([
  {
    entry: {
      index: "./src/index.ts",
      client: "./src/client.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: false,
    target: "node18",
    platform: "node",
    treeshake: true,
    esbuildPlugins: [inlineReactGrabScriptPlugin()],
  },
]);
