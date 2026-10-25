import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, HandHelping, Package, Search } from 'lucide-react';
import ListingSteps from '@/components/marketplace/listing-steps';
import NewListingForm from '@/components/marketplace/new-listing-form';
import { requireAdmin } from '@/lib/auth-guard';
import { getLocale } from '@/lib/i18n-server';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Nuevo anuncio' };

// "Crear con IA" starts the AI work inside the action's time.
export const maxDuration = 300;

interface NewListingPageProps {
  /** `kind=service`: a person offering a service; `kind=wanted`: someone looking for something ("Busco"). */
  searchParams: Promise<{ kind?: string }>;
}

export default async function NewListingPage({ searchParams }: NewListingPageProps) {
  await requireAdmin();
  const [texts, { kind }] = await Promise.all([getLocale().then(adminTexts), searchParams]);
  const listingKind = kind === 'service' || kind === 'wanted' ? kind : 'product';
  const kinds = [
    { value: 'product', label: texts.kindProduct, icon: Package },
    { value: 'service', label: texts.kindService, icon: HandHelping },
    { value: 'wanted', label: texts.kindWanted, icon: Search },
  ] as const;
  const intro = { product: '', service: texts.newServiceIntro, wanted: texts.newWantedIntro }[listingKind];
  return (
    <div className='space-y-8'>
      <Link href='/admin/listings' className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
        <ChevronLeft className='size-4' /> {texts.back}
      </Link>
      {/* One form for all three; the choice only changes what the AI writes and which fields there are. */}
      <div className='mx-auto max-w-xl space-y-3 text-center'>
        <nav aria-label={texts.kindLabel} className='inline-flex rounded-full bg-muted p-1'>
          {kinds.map(({ value, label, icon: Icon }) => (
            <Link
              key={value}
              href={value === 'product' ? '/admin/listings/new' : `/admin/listings/new?kind=${value}`}
              aria-current={value === listingKind ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                value === listingKind ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className='size-4' aria-hidden /> {label}
            </Link>
          ))}
        </nav>
        {intro && <p className='text-sm text-muted-foreground'>{intro}</p>}
      </div>
      <ListingSteps current={0} texts={texts} />
      <NewListingForm key={listingKind} texts={texts} kind={listingKind} />
    </div>
  );
}
