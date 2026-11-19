'use client';

import { Analytics } from '@vercel/analytics/next';

// The secret part of a private link (a partner's panel, a person's listing page) never reaches the page views.
const PRIVATE_LINK = /^(\/(?:gestionar|publicar)\/)[^/?#]+/;

/** Vercel Analytics, with private links' secrets left out of the pages it counts. */
export default function PrivateLinkAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        url.pathname = url.pathname.replace(PRIVATE_LINK, '$1[enlace]');
        return { ...event, url: url.toString() };
      }}
    />
  );
}
