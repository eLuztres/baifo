import { Metadata } from 'next';
import TagAdmin from '@/components/admin/tag-admin';
import { requireAdmin } from '@/lib/auth-guard';
import { LOCALES } from '@/lib/i18n-core';
import { getEnabledLocales, getShopLocale, getT } from '@/lib/i18n-server';
import { adminTexts, statusText } from '@/lib/marketplace/admin-texts';
import { getTagsWithListings } from '@/lib/tags';
import { coverPicture } from '@/lib/video';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('TAGS_ADMIN_TITLE') };
}

/** Every etiqueta in the shop with its name in each language: the admin writes, fixes or deletes them here. */
const TagsPage = async () => {
  await requireAdmin();
  const { t, locale } = await getT();
  const texts = adminTexts(locale);
  const tags = await getTagsWithListings();
  const shopLocale = getShopLocale();
  const languages = [shopLocale, ...getEnabledLocales().filter((id) => id !== shopLocale)].map((id) => ({ id, name: LOCALES.find((option) => option.id === id)?.name ?? id }));

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <h2 className='h2-bold'>{t('TAGS_ADMIN_TITLE')}</h2>
        <p className='max-w-2xl text-muted-foreground'>{t('TAGS_ADMIN_INTRO')}</p>
      </div>
      <TagAdmin
        languages={languages}
        tags={tags.map(({ id, names, submissions }) => ({
          id,
          names,
          listings: submissions.map((listing) => ({
            id: listing.id,
            title: listing.title ?? t('TAG_NO_TITLE'),
            status: statusText(texts, listing.status, listing.type),
            image: coverPicture(listing.images) ?? coverPicture(listing.rawImages),
          })),
        }))}
      />
    </div>
  );
};

export default TagsPage;
