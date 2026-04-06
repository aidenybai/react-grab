import type { NextConfig } from "next";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const solidWebServerPath = require.resolve("solid-js/web");
const solidWebBrowserPath = resolve(dirname(solidWebServerPath), "web.js");

const nextConfig: NextConfig = {
  serverExternalPackages: ["react-grab"],
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias["solid-js/web"] = solidWebBrowserPath;
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/@provider-:name/client.global.js",
        destination: "/api/provider/:name",
      },
    ];
  },
};

export default nextConfig;
