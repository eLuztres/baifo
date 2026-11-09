import { Metadata } from 'next';
import MercadilloAdmin from '@/components/admin/mercadillo-admin';
import { requireAdmin } from '@/lib/auth-guard';
import { localizeProduct, type LocalizedText } from '@/lib/localize';
import { getEnabledLocales, getShopLocale, getT } from '@/lib/i18n-server';
import { getMercadillos } from '@/lib/mercadillos';
import { prisma } from '@/db/prisma';
import { coverPicture } from '@/lib/video';
import type { PickableListing } from '@/components/admin/mercadillo-listings';
import { kindLink, tagLink } from '@/components/admin/mercadillo-search-links';
import type { SearchChoice } from '@/components/shared/explore-search';
import { TYPE_FILTERS } from '@/lib/explore-filters';
import { foldText } from '@/lib/search-text';
import { tagNameIn, type TagNames } from '@/lib/tag-names';

// As on /explore: enough of the description for the search's suggestions.
const SUGGESTION_TEXT_LENGTH = 400;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('MERCADILLOS_ADMIN_TITLE') };
}

/** The Mercadillos: the admin makes and changes them here, and adds listings to them in each listing's editor. */
const MercadillosPage = async () => {
  await requireAdmin();
  const { t, locale } = await getT();
  const [mercadillos, products] = await Promise.all([
    getMercadillos(),
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, shortName: true, description: true, type: true, translations: true, images: true, mercadillos: { select: { id: true } }, submission: { select: { tags: { select: { id: true, names: true } } } } },
    }),
  ]);
  const listings: PickableListing[] = products.map((product) => {
    const tags = (product.submission?.tags ?? []).map((tag) => ({ id: tag.id, names: tag.names as TagNames }));
    const translations = Object.values((product.translations ?? {}) as Record<string, { name?: string; shortName?: string; description?: string }>);
    const names = [product.name, product.shortName, ...translations.flatMap((text) => [text.name, text.shortName]), ...tags.flatMap((tag) => Object.values(tag.names))];
    return {
      id: product.id,
      name: localizeProduct(product, locale).name,
      image: coverPicture(product.images) ?? null,
      mercadilloIds: product.mercadillos.map((mercadillo) => mercadillo.id),
      type: product.type,
      tagIds: tags.map((tag) => tag.id),
      text: {
        names: names.filter(Boolean).map((name) => foldText(name!)).join(' | '),
        rest: foldText([product.description, ...translations.map((text) => text.description)].filter(Boolean).join(' ')).slice(0, SUGGESTION_TEXT_LENGTH),
      },
    };
  });
  // The kinds and etiquetas the search offers while empty, each with how many listings it holds.
  const searchChoices: SearchChoice[] = TYPE_FILTERS.map((filter) => ({ filter, count: listings.filter((listing) => filter.types.includes(listing.type)).length }))
    .filter(({ count }) => count > 0)
    .map(({ filter, count }) => ({ href: kindLink(filter.params[0]), label: t(filter.labelKey), count, text: { names: foldText(t(filter.labelKey)), rest: '' } }));
  const tagCounts = new Map<string, { names: TagNames; count: number }>();
  for (const tag of products.flatMap((product) => product.submission?.tags ?? [])) tagCounts.set(tag.id, { names: tag.names as TagNames, count: (tagCounts.get(tag.id)?.count ?? 0) + 1 });
  const searchTags: SearchChoice[] = [...tagCounts].map(([id, { names, count }]) => ({
    href: tagLink(id),
    label: tagNameIn(names, locale),
    count,
    text: { names: Object.values(names).filter(Boolean).map((name) => foldText(name!)).join(' | '), rest: '' },
  }));
  const shopLocale = getShopLocale();

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <h2 className='h2-bold'>{t('MERCADILLOS_ADMIN_TITLE')}</h2>
        <p className='max-w-2xl text-muted-foreground'>{t('MERCADILLOS_ADMIN_INTRO')}</p>
      </div>
      <MercadilloAdmin
        locale={locale}
        locales={[shopLocale, ...getEnabledLocales().filter((enabled) => enabled !== shopLocale)]}
        mercadillos={mercadillos.map(({ id, slug, name, text, image, icon, contactPhone, _count }) => ({
          id,
          slug,
          name: name as LocalizedText,
          text: text as LocalizedText,
          image,
          icon,
          contactPhone,
          productCount: _count.products,
          productIds: listings.filter((listing) => listing.mercadilloIds.includes(id)).map((listing) => listing.id),
        }))}
        listings={listings}
        searchChoices={searchChoices}
        searchTags={searchTags}
      />
    </div>
  );
};

export default MercadillosPage;
