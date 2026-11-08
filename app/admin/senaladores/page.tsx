import { Metadata } from 'next';
import ScoutAdmin from '@/components/admin/scout-admin';
import { prisma } from '@/db/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { BRAND } from '@/lib/brand';
import { APP_NAME, SERVER_URL } from '@/lib/constants';
import { getShopLocale, getT } from '@/lib/i18n-server';
import { getTranslator } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('SCOUTS_ADMIN_TITLE') };
}

/** The señaladores: people who send others to the shop with their own link and QR. */
const ScoutsPage = async () => {
  await requireAdmin();
  const { t } = await getT();
  // A printed QR can't follow the scanner's language: the message is in the shop's own.
  const tShop = getTranslator(getShopLocale());
  const scouts = await prisma.scout.findMany({ orderBy: { createdAt: 'asc' }, include: { _count: { select: { submissions: true } } } });

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <h2 className='h2-bold'>{t('SCOUTS_ADMIN_TITLE')}</h2>
        <p className='max-w-2xl text-muted-foreground'>{t('SCOUTS_ADMIN_INTRO', { shop: APP_NAME })}</p>
      </div>
      <ScoutAdmin
        shopName={APP_NAME}
        scouts={scouts.map(({ id, name, phone, code, _count }) => {
          const url = `${SERVER_URL}/s/${code}`;
          // The QR holds WhatsApp's own link: a scanner hands it straight to whichever WhatsApp is installed, while a detour
          // through our link stays in the scanner's browser on Android.
          const qrUrl = BRAND.contact.sellWhatsappUrl(tShop('SCOUT_WHATSAPP_MESSAGE', { shop: APP_NAME, name, code })) ?? url;
          return { id, name, phone, code, url, qrUrl, listingCount: _count.submissions };
        })}
      />
    </div>
  );
};

export default ScoutsPage;
