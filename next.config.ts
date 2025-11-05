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
};

export default nextConfig;
