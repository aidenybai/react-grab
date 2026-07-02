import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["react-grab"],
  devIndicators: false,
  productionBrowserSourceMaps: true,
  redirects: async () => [
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
      // :path* matches zero or more segments, so this covers bare /blog too.
      source: "/blog/:path*",
      destination: "/",
      permanent: true,
    },
  ],
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
