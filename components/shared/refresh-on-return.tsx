'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Away at least this long (another app, the phone locked), the page fetches what's new when it shows again. */
export const AWAY_MS = 5 * 60_000;

/**
 * A site added to the home screen is kept alive in the background and comes back as it was, so it showed old listings
 * until it was closed. Refreshing keeps the scroll and anything typed: only the server's data is fetched again.
 */
export default function RefreshOnReturn() {
  const router = useRouter();

  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== null && Date.now() - hiddenAt >= AWAY_MS) router.refresh();
      hiddenAt = null;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [router]);

  return null;
}
