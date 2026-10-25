import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import ListingSteps from '@/components/marketplace/listing-steps';
import NewListingForm from '@/components/marketplace/new-listing-form';
import { requireAdmin } from '@/lib/auth-guard';
import { getLocale } from '@/lib/i18n-server';
import { adminTexts } from '@/lib/marketplace/admin-texts';

export const metadata: Metadata = { title: 'Nuevo anuncio' };

// "Crear con IA" starts the AI work inside the action's time.
export const maxDuration = 300;

interface NewListingPageProps {
  /** `kind=service`: a person offering a service instead of an item (the "+" menu's "New service"). */
  searchParams: Promise<{ kind?: string }>;
}

export default async function NewListingPage({ searchParams }: NewListingPageProps) {
  await requireAdmin();
  const [texts, { kind }] = await Promise.all([getLocale().then(adminTexts), searchParams]);
  const isService = kind === 'service';
  return (
    <div className='space-y-8'>
      <Link href='/admin/listings' className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
        <ChevronLeft className='size-4' /> {texts.back}
      </Link>
      {isService && (
        <div className='mx-auto max-w-xl space-y-1 text-center'>
          <h2 className='font-display text-2xl'>{texts.newService}</h2>
          <p className='text-sm text-muted-foreground'>{texts.newServiceIntro}</p>
        </div>
      )}
      <ListingSteps current={0} texts={texts} />
      <NewListingForm texts={texts} kind={isService ? 'service' : 'product'} />
    </div>
  );
}
