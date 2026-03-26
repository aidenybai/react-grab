import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["react-grab"],
  // HACK: disable react compiler to avoid issues with source mangling
  reactCompiler: false,
  productionBrowserSourceMaps: true,
  turbopack: {
    root: "../..",
  },
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
    return [
      {
        source: "/",
        headers: [
          {
            key: "Vary",
            value: "Accept",
          },
        ],
      },
    ];
  },
  rewrites: async () => {
    return {
      beforeFiles: [
        {
          source: "/",
          destination: "/llms.txt",
          has: [
            {
              type: "header",
              key: "accept",
              value: "(.*)text/markdown(.*)",
            },
          ],
        },
        {
          source: "/llm.txt",
          destination: "/llms.txt",
        },
      ],
    };
  },
};

export default nextConfig;
