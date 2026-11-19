import type { Metadata } from 'next';
import PartnerAdmin from '@/components/admin/partner-admin';
import { prisma } from '@/db/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { APP_NAME, SERVER_URL } from '@/lib/constants';
import { getEnabledLocales, getShopLocale, getT } from '@/lib/i18n-server';
import type { LocalizedText } from '@/lib/localize';
import { PARTNER_ACTIVE_STATUSES } from '@/lib/partner-access';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('PARTNERS_ADMIN_TITLE') };
}

/** The partners' mercadillos: the admin makes them, sends each its private link and changes its details and limit. */
export default async function PartnersPage() {
  await requireAdmin();
  const { t, locale } = await getT();
  const partners = await prisma.partner.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { submissions: { where: { status: { in: PARTNER_ACTIVE_STATUSES } } } } } },
  });
  const shopLocale = getShopLocale();

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <h2 className='h2-bold'>{t('PARTNERS_ADMIN_TITLE')}</h2>
        <p className='max-w-2xl text-muted-foreground'>{t('PARTNERS_ADMIN_INTRO', { shop: APP_NAME })}</p>
      </div>
      <PartnerAdmin
        locale={locale}
        locales={[shopLocale, ...getEnabledLocales().filter((enabled) => enabled !== shopLocale)]}
        shopName={APP_NAME}
        partners={partners.map(({ id, slug, name, text, icon, contactPhone, maxListings, token, _count }) => ({
          id,
          slug,
          name: name as LocalizedText,
          text: text as LocalizedText,
          icon,
          contactPhone,
          maxListings,
          panelUrl: `${SERVER_URL}/gestionar/${token}`,
          listingCount: _count.submissions,
        }))}
      />
    </div>
  );
}
