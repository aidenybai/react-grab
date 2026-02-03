import { defineConfig, type Options } from "tsup";
import babel from "esbuild-plugin-babel";

const options: Options = {
  clean: true,
  dts: true,
  entry: ["./src/index.tsx"],
  env: {
    NODE_ENV: process.env.NODE_ENV ?? "development",
  },
  format: ["cjs", "esm"],
  loader: {
    ".css": "text",
  },
  minify: process.env.NODE_ENV === "production",
  noExternal: ["solid-js", /^react-grab\/src/, "react-grab/dist/styles.css"],
  outDir: "./dist",
  platform: "browser",
  sourcemap: false,
  splitting: false,
  target: "esnext",
  treeshake: true,
  esbuildPlugins: [
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- babel is not typed
    babel({
      filter: /\.(tsx|jsx)$/,
      config: {
        presets: [
          ["@babel/preset-typescript", { onlyRemoveTypeImports: true }],
          "babel-preset-solid",
        ],
      },
    }),
  ],
};

export default defineConfig(options);
