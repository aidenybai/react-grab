import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["react-grab"],
  devIndicators: false,
  headers: async () => [
    {
      source: "/",
      headers: [
        {
          key: "Vary",
          value: "Accept",
        },
      ],
    },
  ],
};

export default nextConfig;
