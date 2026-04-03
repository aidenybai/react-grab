import * as babel from "@babel/core";
import { createRequire } from "node:module";
import fs from "node:fs";
import { dirname, resolve } from "node:path";

const CSS_TEXT_SUFFIX = "?css-text";

export const cssTextPlugin = () => {
  return {
    name: "css-text",
    enforce: "pre" as const,
    async resolveId(
      this: { resolve: (source: string, importer?: string) => Promise<{ id: string } | null> },
      source: string,
      importer: string | undefined,
    ) {
      if (!source.endsWith(".css")) return;
      if (source.startsWith(".") || source.startsWith("/")) {
        const resolved = importer ? resolve(dirname(importer), source) : source;
        return resolved + CSS_TEXT_SUFFIX;
      }
      const resolved = await this.resolve(source, importer);
      if (resolved) return resolved.id + CSS_TEXT_SUFFIX;
    },
    load(id: string) {
      if (!id.endsWith(CSS_TEXT_SUFFIX)) return;
      const filePath = id.slice(0, -CSS_TEXT_SUFFIX.length);
      const content = fs.readFileSync(filePath, "utf8");
      return `export default ${JSON.stringify(content)};`;
    },
  };
};

export const solidWebBrowserPlugin = () => {
  const require = createRequire(import.meta.url);
  const serverPath = require.resolve("solid-js/web");
  const distDir = dirname(serverPath);
  const browserPath = resolve(distDir, "web.js");
  return {
    name: "solid-web-browser",
    enforce: "pre" as const,
    resolveId(source: string) {
      if (source === "solid-js/web") return browserPath;
    },
  };
};

export const solidBabelPlugin = (filter: RegExp = /\.(tsx|jsx)$/) => ({
  name: "solid-babel",
  transform(code: string, id: string) {
    if (!filter.test(id)) return;

    const result = babel.transformSync(code, {
      presets: [
        ["@babel/preset-typescript", { onlyRemoveTypeImports: true }],
        "babel-preset-solid",
      ],
      filename: id,
      sourceMaps: true,
      caller: { name: "solid-babel", supportsStaticESM: true },
    });

    if (!result?.code) return;
    return { code: result.code, map: result.map };
  },
});
