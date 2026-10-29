import { notFound } from 'next/navigation';
import ListingWorkspace from '@/components/marketplace/listing-workspace';
import { localize } from '@/lib/category';
import { LOCALES, type Locale } from '@/lib/i18n-core';
import { getEnabledLocales, getShopLocale } from '@/lib/i18n-server';
import { getAdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { getListingCategories } from '@/lib/marketplace/catalog';
import { getShopPlaces } from '@/lib/places';

interface AdminListingWorkspaceProps {
  id: string;
  locale: Locale;
  texts: AdminTexts;
}

/** A listing loaded into its workspace: on "Anuncios" to edit it, on "Nuevo anuncio" while it is being made. */
export default async function AdminListingWorkspace({ id, locale, texts }: AdminListingWorkspaceProps) {
  const listing = await getAdminListing(id);
  if (!listing) notFound();
  const [categories, places] = await Promise.all([getListingCategories(), getShopPlaces(locale)]);
  const shopLocale = getShopLocale();
  const languageOf = (language: Locale) => ({ id: language, label: LOCALES.find((option) => option.id === language)?.label ?? language });
  // The shop language's text is the listing's own; every other language gets its own title and description.
  const languages = getEnabledLocales()
    .filter((language) => language !== shopLocale)
    .map(languageOf);

  return (
    <>
      {/* The editor shows the title as the big editable headline. */}
      <h1 className='sr-only'>{listing.title ?? texts.newListing}</h1>
      <ListingWorkspace
        initial={listing}
        // "Parent · Child": a subcategory's own name may not say where it belongs.
        categories={categories.map(({ slug, name, parent }) => ({ slug, name: [parent?.name, name].filter(Boolean).map((text) => localize(text, locale)).join(' · ') }))}
        // Live places, and the listing's own even when it isn't live (anymore).
        places={places.filter((place) => place.isLive || place.id === listing.placeId).map(({ id, name }) => ({ id, name }))}
        languages={languages}
        shopLanguage={languageOf(shopLocale)}
        texts={texts}
      />
    </>
  );
}
