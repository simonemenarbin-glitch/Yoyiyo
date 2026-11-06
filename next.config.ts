import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hostinger Node builds OOM with many static workers (SIGABRT).
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
