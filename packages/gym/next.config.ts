import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
