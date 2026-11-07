import { notFound } from 'next/navigation';
import ListingWorkspace from '@/components/marketplace/listing-workspace';
import { localize } from '@/lib/localize';
import { MAX_LISTING_TAGS } from '@/lib/constants';
import { getTagOptions } from '@/lib/tags';
import { LOCALES, type Locale } from '@/lib/i18n-core';
import { getEnabledLocales, getShopLocale } from '@/lib/i18n-server';
import { getAdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { LISTING_DAYS } from '@/lib/marketplace/config';
import { getMercadillos } from '@/lib/mercadillos';
import { prisma } from '@/db/prisma';

interface AdminListingWorkspaceProps {
  id: string;
  locale: Locale;
  texts: AdminTexts;
}

/** A listing loaded into its workspace: on "Anuncios" to edit it, on "Nuevo anuncio" while it is being made. */
export default async function AdminListingWorkspace({ id, locale, texts }: AdminListingWorkspaceProps) {
  const listing = await getAdminListing(id);
  if (!listing) notFound();
  const [mercadillos, tagOptions, scouts] = await Promise.all([
    getMercadillos(),
    getTagOptions(),
    prisma.scout.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
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
        mercadillos={mercadillos.map(({ id, name }) => ({ id, name: localize(name, locale) }))}
        scouts={scouts}
        tagOptions={tagOptions}
        maxTags={MAX_LISTING_TAGS}
        languages={languages}
        shopLanguage={languageOf(shopLocale)}
        listingDays={LISTING_DAYS}
        texts={texts}
      />
    </>
  );
}
