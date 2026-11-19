import { notFound } from 'next/navigation';
import ListingWorkspace from '@/components/marketplace/listing-workspace';
import type { PartnerEditor } from '@/components/marketplace/editor-types';
import { localize } from '@/lib/localize';
import { MAX_LISTING_TAGS } from '@/lib/constants';
import { getTagOptions } from '@/lib/tags';
import { LOCALES, type Locale } from '@/lib/i18n-core';
import { getEnabledLocales, getShopLocale } from '@/lib/i18n-server';
import { getAdminListing } from '@/lib/marketplace/admin.actions';
import type { AdminTexts } from '@/lib/marketplace/admin-texts';
import { LISTING_DAYS } from '@/lib/marketplace/config';
import { getMercadillos, listingsOf, type Mercadillo } from '@/lib/mercadillos';
import { nextFreeDay } from '@/lib/marketplace/schedule';
import { prisma } from '@/db/prisma';

interface AdminListingWorkspaceProps {
  id: string;
  locale: Locale;
  texts: AdminTexts;
  /** A partner in its panel: no selecciones or señaladores, and it goes back to the panel. */
  partner?: PartnerEditor;
}

/** A "Solo aquí" selección's next day without a listing: after its newest one online and its last one waiting for its day. */
async function nextFreeDayOf({ id, tagIds }: Mercadillo) {
  const [online, waiting] = await Promise.all([
    prisma.product.aggregate({ where: listingsOf(id, tagIds), _max: { createdAt: true } }),
    prisma.submission.aggregate({
      where: { status: { in: ['PROCESSING', 'IN_REVIEW'] }, autoPublish: true, OR: [{ mercadillos: { some: { id } } }, { tags: { some: { id: { in: tagIds } } } }] },
      _max: { publishAt: true },
    }),
  ]);
  return nextFreeDay([online._max.createdAt, waiting._max.publishAt].filter((day): day is Date => Boolean(day)));
}

/** A listing loaded into its workspace: on "Anuncios" to edit it, on "Nuevo anuncio" while it is being made. */
export default async function AdminListingWorkspace({ id, locale, texts, partner }: AdminListingWorkspaceProps) {
  const listing = await getAdminListing(id);
  if (!listing) notFound();
  const [mercadillos, tagOptions, scouts] = await Promise.all([
    partner ? [] : getMercadillos(),
    getTagOptions(),
    partner ? [] : prisma.scout.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  const nextFreeDays = new Map(await Promise.all(mercadillos.filter((mercadillo) => mercadillo.isApart).map(async (mercadillo) => [mercadillo.id, await nextFreeDayOf(mercadillo)] as const)));
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
        mercadillos={mercadillos.map(({ id, name, isApart, tagIds }) => ({ id, name: localize(name, locale), isApart, nextFreeDay: nextFreeDays.get(id), tagIds }))}
        scouts={scouts}
        tagOptions={tagOptions}
        maxTags={MAX_LISTING_TAGS}
        languages={languages}
        shopLanguage={languageOf(shopLocale)}
        listingDays={LISTING_DAYS}
        texts={texts}
        partner={partner}
      />
    </>
  );
}
