import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["react-grab"],
  // HACK: disable react compiler to avoid issues with source mangling
  reactCompiler: false,
  productionBrowserSourceMaps: true,
  turbopack: {},
  experimental: {
    optimizeCss: true,
    inlineCss: true,
  },
  devIndicators: false,
  webpack: (config, { dev, isServer }) => {
    if (!isServer && !dev) {
      config.devtool = "source-map";
    }
    return config;
  },
  redirects: async () => {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.react-grab.com" }],
        destination: "https://react-grab.com/:path*",
        permanent: true,
      },
      {
        source: "/docs",
        destination: "https://github.com/aidenybai/react-grab#readme",
        permanent: false,
      },
      {
        source: "/primitives",
        destination:
          "https://github.com/aidenybai/react-grab/tree/main?tab=readme-ov-file#primitives",
        permanent: false,
      },
      {
        source: "/blog/:path*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/blog",
        destination: "/",
        permanent: true,
      },
    ];
  },
  headers: async () => {
    const markdownContentType = { key: "Content-Type", value: "text/markdown; charset=utf-8" };
    const allowAllOrigins = { key: "Access-Control-Allow-Origin", value: "*" };

    return [
      {
        source: "/:path*\\.md",
        headers: [markdownContentType, allowAllOrigins],
      },
      {
        source: "/llms.txt",
        headers: [markdownContentType, allowAllOrigins],
      },
      {
        source: "/llms-full.txt",
        headers: [markdownContentType, allowAllOrigins],
      },
    ];
  },
  rewrites: async () => {
    return {
      beforeFiles: [
        { source: "/llm.txt", destination: "/llms.txt" },
        { source: "/index.html.md", destination: "/index.md" },
        { source: "/privacy/index.md", destination: "/privacy.md" },
        { source: "/changelog/index.md", destination: "/changelog.md" },
      ],
    };
  },
};

export default nextConfig;
