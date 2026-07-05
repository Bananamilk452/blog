import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "rdf-canonize-native": false,
    };

    return config;
  },
  images: {
    remotePatterns: [new URL(`${process.env.S3_PUBLIC_URL}/**`)],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
