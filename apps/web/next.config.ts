import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  transpilePackages: ['@haulyard/shared-types'],
  output: 'standalone',
  // pnpm monorepo: resolve `next` from repo root (avoids Turbopack "package not found")
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
