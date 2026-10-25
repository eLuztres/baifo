import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import NewListingForm from '@/components/marketplace/new-listing-form';
import { requireAdmin } from '@/lib/auth-guard';
import { getLocale } from '@/lib/i18n-server';
import { adminTexts } from '@/lib/marketplace/admin-texts';

export const metadata: Metadata = { title: 'Nuevo anuncio' };

// "Crear con IA" starts the AI work inside the action's time.
export const maxDuration = 300;

export default async function NewListingPage() {
  await requireAdmin();
  const texts = adminTexts(await getLocale());
  return (
    <div className='space-y-8'>
      <Link href='/admin/listings' className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
        <ChevronLeft className='size-4' /> {texts.back}
      </Link>
      <NewListingForm texts={texts} />
    </div>
  );
}
