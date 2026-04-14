import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-expect-error - eslint property is sometimes missing in NextConfig types in certain versions
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
