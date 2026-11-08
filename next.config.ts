import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./lib/security-headers";

// The routes that process listings run ffmpeg (video clean-up); its binary isn't traced on its own.
const FFMPEG_BINARY = ['./node_modules/ffmpeg-static/ffmpeg'];

// A private preview (PREVIEW_PASSWORD set) stays out of search engines, pictures included.
const NOINDEX_HEADERS = process.env.PREVIEW_PASSWORD ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : [];

// The app's id is inside its token (base64 JSON), so no extra setting is needed.
function uploadthingAppId() {
  try {
    return process.env.UPLOADTHING_APPID || JSON.parse(Buffer.from(process.env.UPLOADTHING_TOKEN ?? '', 'base64').toString()).appId;
  } catch {
    return undefined;
  }
}
const UPLOADTHING_APP_ID: string | undefined = uploadthingAppId();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Share tags always in <head>: a phone's share sheet builds the WhatsApp preview with a browser user agent,
  // and Next.js would stream the metadata into the body for those, so the preview fell back to the icon.
  htmlLimitedBots: /.*/,
  async headers() {
    return [{ source: '/:path*', headers: [...SECURITY_HEADERS, ...NOINDEX_HEADERS] }];
  },
  // The corral pages are gone (#535); links already shared land on the home page.
  async redirects() {
    return [{ source: '/corral/:slug*', destination: '/', permanent: false }];
  },
  // UploadThing files through this site: Spanish networks block UploadThing's Cloudflare addresses during football (#556).
  async rewrites() {
    return UPLOADTHING_APP_ID ? [{ source: '/media/:key', destination: `https://${UPLOADTHING_APP_ID}.ufs.sh/f/:key` }] : [];
  },
  serverExternalPackages: ['ffmpeg-static'],
  outputFileTracingIncludes: {
    '/admin/listings/**': FFMPEG_BINARY,
    '/api/cron/marketplace': FFMPEG_BINARY,
    '/api/whatsapp': FFMPEG_BINARY,
    // The home slideshow lists its pictures from the folder at request time.
    '/': ['./public/brand/hero/**'],
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
