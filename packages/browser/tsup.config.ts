import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";

const REACT_GRAB_SCRIPT_PATH = join(__dirname, "../react-grab/dist/index.global.js");

const getReactGrabScript = (): string => {
  if (existsSync(REACT_GRAB_SCRIPT_PATH)) {
    return readFileSync(REACT_GRAB_SCRIPT_PATH, "utf-8");
  }
  return "";
};

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
    define: {
      __REACT_GRAB_SCRIPT__: JSON.stringify(getReactGrabScript()),
    },
  },
]);
