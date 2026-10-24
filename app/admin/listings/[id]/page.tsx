import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import ListingSteps from '@/components/marketplace/listing-steps';
import ListingWorkspace from '@/components/marketplace/listing-workspace';
import { getCategoryOptions } from '@/lib/actions/category.actions';
import { requireAdmin } from '@/lib/auth-guard';
import { getLocale } from '@/lib/i18n-server';
import { getAdminListing } from '@/lib/marketplace/admin.actions';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { HOUSE_SELLER } from '@/lib/marketplace/config';

export const metadata: Metadata = { title: 'Anuncio' };

// The AI work started by "Crear con IA" runs within the action's time; this page only reads.
export const maxDuration = 300;

interface ListingPageProps {
  params: Promise<{ id: string }>;
}

export default async function ListingPage({ params }: ListingPageProps) {
  await requireAdmin();
  const [{ id }, locale] = await Promise.all([params, getLocale()]);
  const [listing, categories] = await Promise.all([getAdminListing(id), getCategoryOptions('es')]);
  if (!listing) notFound();
  const texts = adminTexts(locale);

  return (
    <div className='space-y-8'>
      <Link href='/admin/listings' className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
        <ChevronLeft className='size-4' /> {texts.back}
      </Link>
      <div className='space-y-4'>
        <h1 className='h2-bold'>{listing.title ?? texts.newListing}</h1>
        {listing.createdByAdmin && listing.status !== 'LIVE' && <ListingSteps current={listing.status === 'PROCESSING' ? 1 : 2} texts={texts} />}
      </div>
      <ListingWorkspace initial={listing} categories={categories.map((category) => category.name)} texts={texts} houseSeller={HOUSE_SELLER} />
    </div>
  );
}
