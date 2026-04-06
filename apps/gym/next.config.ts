import type { NextConfig } from "next";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const solidWebServerPath = require.resolve("solid-js/web");
const solidWebBrowserPath = resolve(dirname(solidWebServerPath), "web.js");

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,
  serverExternalPackages: ["react-grab"],
  webpack: (config, { isServer }) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias["solid-js/web"] = solidWebBrowserPath;
    if (!isServer) {
      config.optimization ??= {};
      config.optimization.minimize = false;
    }
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
