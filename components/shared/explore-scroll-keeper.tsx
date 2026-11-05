'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'explore-scroll';

interface SavedScroll {
  url: string;
  y: number;
}

// Sorted: the listing's way back writes the same filters in its own order.
const currentUrl = () => {
  const params = new URLSearchParams(window.location.search);
  params.sort();
  return `${window.location.pathname}?${params}`;
};

/** Back from a listing (its arrow opens the list anew), the list opens where the visitor left it, not at the top. */
export default function ExploreScrollKeeper() {
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as SavedScroll | null;
      sessionStorage.removeItem(STORAGE_KEY);
      // After the router's own scroll to the top of a new page.
      if (saved?.url === currentUrl()) requestAnimationFrame(() => window.scrollTo({ top: saved.y, behavior: 'instant' }));
    } catch {
      // Storage blocked (private mode): the list simply opens at the top.
    }

    const rememberSpot = (event: MouseEvent) => {
      if (!(event.target as Element).closest?.('a[href^="/product/"]')) return;
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ url: currentUrl(), y: window.scrollY } satisfies SavedScroll));
      } catch {
        // Nothing to remember without storage.
      }
    };
    document.addEventListener('click', rememberSpot, true);
    return () => document.removeEventListener('click', rememberSpot, true);
  }, []);

  return null;
}
