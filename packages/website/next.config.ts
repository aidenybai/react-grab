import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["react-grab"],
  // this causes sources to be mangled
  reactCompiler: false,
  productionBrowserSourceMaps: true,
  turbopack: {},
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
