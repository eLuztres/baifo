import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import OfferAdmin, { type AdminOffer } from '@/components/admin/offer-admin';
import type { OfferDraft } from '@/components/admin/offer-form';
import { requireAdmin } from '@/lib/auth-guard';
import { OFFERS_ENABLED } from '@/lib/constants';
import { toShopDateTime } from '@/lib/event-date';
import { getShopLocale, getT } from '@/lib/i18n-server';
import { localizeOffer, offerStatus } from '@/lib/offers-core';
import { prisma } from '@/db/prisma';
import { formatDateTime } from '@/lib/utils';

// A new offer starts now and runs for a month.
const NEW_OFFER_DAYS = 30;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('OFFERS_ADMIN_TITLE') };
}

/** The offers: big announcements on the home page and /ofertas, each between its start and end. */
const OffersAdminPage = async () => {
  await requireAdmin();
  if (!OFFERS_ENABLED) notFound();
  const [{ t, locale }, stored] = await Promise.all([getT(), prisma.offer.findMany({ orderBy: [{ sortOrder: 'asc' }, { startsAt: 'desc' }] })]);
  // The texts as the admin wrote them: in the shop's language.
  const shopLocale = getShopLocale();
  const now = new Date();

  const offers: AdminOffer[] = stored.map((offer) => {
    const { title, text, audience, icon } = localizeOffer(offer, shopLocale);
    return {
      id: offer.id,
      status: offerStatus(offer, now),
      period: `${formatDateTime(offer.startsAt, locale).dateTime} – ${formatDateTime(offer.endsAt, locale).dateTime}`,
      draft: {
        title,
        text,
        audience,
        icon,
        linkUrl: offer.linkUrl ?? '',
        startsAt: toShopDateTime(offer.startsAt),
        endsAt: toShopDateTime(offer.endsAt),
        sortOrder: offer.sortOrder,
        isActive: offer.isActive,
      },
    };
  });

  const newDraft: OfferDraft = {
    title: '',
    text: '',
    audience: '',
    icon: 'Megaphone',
    linkUrl: '',
    startsAt: toShopDateTime(now),
    endsAt: toShopDateTime(new Date(now.getTime() + NEW_OFFER_DAYS * 24 * 60 * 60 * 1000)),
    sortOrder: 0,
    isActive: true,
  };

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <h2 className='h2-bold'>{t('OFFERS_ADMIN_TITLE')}</h2>
        <p className='max-w-2xl text-muted-foreground'>{t('OFFERS_ADMIN_INTRO')}</p>
      </div>
      <OfferAdmin offers={offers} newDraft={newDraft} />
    </div>
  );
};

export default OffersAdminPage;
