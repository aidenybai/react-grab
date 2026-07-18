import type { NextConfig } from "next";

const reactGrabDevelopmentAliases = {
  "react-grab/primitives": "@react-grab/e2e-development/primitives",
  "react-grab": "@react-grab/e2e-development",
};

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  turbopack: {
    resolveAlias: process.env.NODE_ENV === "development" ? reactGrabDevelopmentAliases : undefined,
  },
  typescript: {
    tsconfigPath: process.env.NEXT_TSCONFIG_PATH ?? "tsconfig.json",
  },
};

export default nextConfig;
