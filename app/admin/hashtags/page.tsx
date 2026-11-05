import { Metadata } from 'next';
import HashtagAdmin from '@/components/admin/hashtag-admin';
import { requireAdmin } from '@/lib/auth-guard';
import { getHashtagsWithListings } from '@/lib/hashtags';
import { getT } from '@/lib/i18n-server';
import { adminTexts, statusText } from '@/lib/marketplace/admin-texts';
import { coverPicture } from '@/lib/video';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('HASHTAGS_ADMIN_TITLE') };
}

/** Every hashtag in the shop: the admin finds, makes, renames or deletes them here, and sets them in each listing's "Más". */
const HashtagsPage = async () => {
  await requireAdmin();
  const { t, locale } = await getT();
  const texts = adminTexts(locale);
  const hashtags = await getHashtagsWithListings();

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <h2 className='h2-bold'>{t('HASHTAGS_ADMIN_TITLE')}</h2>
        <p className='max-w-2xl text-muted-foreground'>{t('HASHTAGS_ADMIN_INTRO')}</p>
      </div>
      <HashtagAdmin
        hashtags={hashtags.map(({ id, slug, name, submissions }) => ({
          id,
          slug,
          name,
          listings: submissions.map((listing) => ({
            id: listing.id,
            title: listing.title ?? t('HASHTAG_NO_TITLE'),
            status: statusText(texts, listing.status, listing.type),
            image: coverPicture(listing.images) ?? coverPicture(listing.rawImages),
          })),
        }))}
      />
    </div>
  );
};

export default HashtagsPage;
