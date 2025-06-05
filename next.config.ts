import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [],
    },
  },
  // Allow development access from local network
  allowedDevOrigins: ['192.168.1.203'],
};

export default nextConfig;
