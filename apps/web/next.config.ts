import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@fleetos/shared-types'],
  output: 'standalone',
};

export default nextConfig;
