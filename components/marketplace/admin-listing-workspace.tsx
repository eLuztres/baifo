import { notFound } from 'next/navigation';
import ListingWorkspace from '@/components/marketplace/listing-workspace';
import { localize } from '@/lib/category';
import { MAX_LISTING_CATEGORIES, MAX_LISTING_HASHTAGS } from '@/lib/constants';
import { getHashtagOptions } from '@/lib/hashtags';
import { LOCALES, type Locale } from '@/lib/i18n-core';
import { getEnabledLocales, getShopLocale } from '@/lib/i18n-server';
import { getAdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { getListingCategories } from '@/lib/marketplace/catalog';
import { LISTING_DAYS } from '@/lib/marketplace/config';
import { getMercadillos } from '@/lib/mercadillos';

interface AdminListingWorkspaceProps {
  id: string;
  locale: Locale;
  texts: AdminTexts;
}

/** A listing loaded into its workspace: on "Anuncios" to edit it, on "Nuevo anuncio" while it is being made. */
export default async function AdminListingWorkspace({ id, locale, texts }: AdminListingWorkspaceProps) {
  const listing = await getAdminListing(id);
  if (!listing) notFound();
  const [categories, mercadillos, hashtagOptions] = await Promise.all([getListingCategories(), getMercadillos(), getHashtagOptions()]);
  const shopLocale = getShopLocale();
  const languageOf = (language: Locale) => ({ id: language, label: LOCALES.find((option) => option.id === language)?.label ?? language });
  // The shop language's text is the listing's own; every other language gets its own title and description.
  const languages = getEnabledLocales()
    .filter((language) => language !== shopLocale)
    .map(languageOf);

  return (
    <>
      <ListingWorkspace
        initial={listing}
        // "Parent · Child": a subcategory's own name may not say where it belongs.
        categories={categories.map(({ slug, name, parent }) => ({ slug, name: [parent?.name, name].filter(Boolean).map((text) => localize(text, locale)).join(' · ') }))}
        mercadillos={mercadillos.map(({ id, name }) => ({ id, name: localize(name, locale) }))}
        hashtagOptions={hashtagOptions}
        maxHashtags={MAX_LISTING_HASHTAGS}
        languages={languages}
        shopLanguage={languageOf(shopLocale)}
        listingDays={LISTING_DAYS}
        maxCategories={MAX_LISTING_CATEGORIES}
        texts={texts}
      />
    </>
  );
}
