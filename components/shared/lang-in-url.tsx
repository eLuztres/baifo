'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useI18n } from '@/components/i18n-provider';
import { withLang } from '@/lib/i18n-core';

/** Keeps `?lang=` in the address on the language shown, so a copied or shared link opens the same way. */
export default function LangInUrl() {
  const { locale, locales } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasChoice = locales.length > 1;

  useEffect(() => {
    if (!hasChoice || searchParams.get('lang') === locale) return;
    const { pathname: path, search, hash } = window.location;
    // Only the address changes: no reload and no new request.
    window.history.replaceState(window.history.state, '', withLang(`${path}${search}${hash}`, locale));
  }, [hasChoice, locale, pathname, searchParams]);

  return null;
}
