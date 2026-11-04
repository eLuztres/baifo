import type { MetadataRoute } from 'next';
import { SERVER_URL } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  if (process.env.PREVIEW_PASSWORD) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Accounts, checkout and the sellers' private links: nothing to find there.
      disallow: ['/admin', '/user', '/api', '/publicar'],
    },
    sitemap: `${SERVER_URL}/sitemap.xml`,
  };
}
