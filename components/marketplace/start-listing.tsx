'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { ListingType } from '@/lib/constants';
import { startAdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';

interface StartListingProps {
  type: ListingType;
  texts: AdminTexts;
}

/** "Nuevo anuncio" opens a draft right away, so its pictures, description and contact can be filled in any order. */
export default function StartListing({ type, texts }: StartListingProps) {
  const router = useRouter();
  // Strict mode runs effects twice: one draft only.
  const isStarted = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isStarted.current) return;
    isStarted.current = true;
    startAdminListing(type).then((result) => {
      if ('id' in result && result.id) router.replace(`/admin/listings/new?anuncio=${result.id}`);
      else setError(result.message);
    });
  }, [type, router]);

  if (error) {
    return (
      <p role='alert' className='mx-auto max-w-xl rounded-2xl border border-destructive/40 p-3 text-sm text-destructive'>
        {error}
      </p>
    );
  }
  return (
    <div className='flex justify-center py-16' aria-label={texts.newListing}>
      <Loader2 className='size-8 animate-spin text-primary' />
    </div>
  );
}
