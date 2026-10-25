import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import ListingWorkspace from '@/components/marketplace/listing-workspace';
import { requireAdmin } from '@/lib/auth-guard';
import { localize } from '@/lib/category';
import { LOCALES, type Locale } from '@/lib/i18n-core';
import { getEnabledLocales, getLocale, getShopLocale } from '@/lib/i18n-server';
import { getAdminListing } from '@/lib/marketplace/admin.actions';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { getListingCategories } from '@/lib/marketplace/catalog';
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
  const [listing, categories] = await Promise.all([getAdminListing(id), getListingCategories()]);
  if (!listing) notFound();
  const texts = adminTexts(locale);
  const shopLocale = getShopLocale();
  const languageOf = (language: Locale) => ({ id: language, label: LOCALES.find((option) => option.id === language)?.label ?? language });
  // The shop language's text is the listing's own; every other language gets its own title and description.
  const languages = getEnabledLocales()
    .filter((language) => language !== shopLocale)
    .map(languageOf);

  return (
    <div className='space-y-4'>
      <Link href='/admin/listings' className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
        <ChevronLeft className='size-4' /> {texts.back}
      </Link>
      {/* The editor shows the title as the big editable headline. */}
      <h1 className='sr-only'>{listing.title ?? texts.newListing}</h1>
      <ListingWorkspace
        initial={listing}
        categories={categories.map(({ slug, name }) => ({ slug, name: localize(name, locale) }))}
        languages={languages}
        shopLanguage={languageOf(shopLocale)}
        texts={texts}
        houseSeller={HOUSE_SELLER}
      />
    </div>
  );
}
