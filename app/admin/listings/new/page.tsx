import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import AdminListingWorkspace from '@/components/marketplace/admin-listing-workspace';
import ListingTypeTabs from '@/components/marketplace/listing-type-tabs';
import NewListingForm from '@/components/marketplace/new-listing-form';
import { requireAdmin } from '@/lib/auth-guard';
import { getLocale } from '@/lib/i18n-server';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { listingTypeOf } from '@/lib/constants';

export async function generateMetadata(): Promise<Metadata> {
  return { title: adminTexts(await getLocale()).newListing };
}

// "Crear con IA" starts the AI work inside the action's time.
export const maxDuration = 300;

interface NewListingPageProps {
  /**
   * `tipo`: the listing type's link name (LISTING_TYPE_PARAMS), e.g. servicios; none: a product.
   * `anuncio`: the listing made by "Crear con IA", so the whole creation stays on this page (and survives a reload).
   */
  searchParams: Promise<{ tipo?: string; anuncio?: string }>;
}

export default async function NewListingPage({ searchParams }: NewListingPageProps) {
  await requireAdmin();
  const [locale, { tipo, anuncio }] = await Promise.all([getLocale(), searchParams]);
  const texts = adminTexts(locale);
  const backLink = (
    <Link href='/admin/listings' className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
      <ChevronLeft className='size-4' /> {texts.back}
    </Link>
  );
  if (anuncio) {
    return (
      <div className='space-y-4'>
        {backLink}
        <AdminListingWorkspace id={anuncio} locale={locale} texts={texts} />
      </div>
    );
  }
  const listingType = listingTypeOf(tipo) ?? 'PRODUCT';
  return (
    <div className='space-y-8'>
      {backLink}
      {/* One form for all four; the choice only changes what the AI writes and which fields there are. */}
      <ListingTypeTabs type={listingType} texts={texts} hasLinks hasInfo />
      {/* No key on the type: switching tabs keeps the photos already uploaded. */}
      <NewListingForm texts={texts} type={listingType} />
    </div>
  );
}
