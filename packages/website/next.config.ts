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
        source: "/benchmarks",
        destination: "/blog/intro",
        permanent: true,
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
