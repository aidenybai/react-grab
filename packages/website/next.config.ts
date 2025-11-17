import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["react-grab"],
  reactCompiler: true,
  productionBrowserSourceMaps: true,
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
      ],
    };
  },
};

export default nextConfig;
