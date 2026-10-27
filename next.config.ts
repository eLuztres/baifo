import type { NextConfig } from "next";

// The routes that process listings run ffmpeg (video clean-up); its binary isn't traced on its own.
const FFMPEG_BINARY = ['./node_modules/ffmpeg-static/ffmpeg'];

const nextConfig: NextConfig = {
  serverExternalPackages: ['ffmpeg-static'],
  outputFileTracingIncludes: {
    '/admin/listings/**': FFMPEG_BINARY,
    '/api/cron/marketplace': FFMPEG_BINARY,
    '/api/whatsapp': FFMPEG_BINARY,
  },
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
