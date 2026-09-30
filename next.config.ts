import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io',
        port: '',
      },
      // UploadThing's newer file URLs (`ufsUrl`)
      {
        protocol: 'https',
        hostname: '*.ufs.sh',
      },
    ],
  },
};

export default nextConfig;
