import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["react-grab"],
  reactCompiler: true,
};

export default nextConfig;
