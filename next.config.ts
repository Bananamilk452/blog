import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
