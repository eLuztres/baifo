import type { Metadata } from 'next';
import { cache } from 'react';
import { prisma } from '@/db/prisma';
import { absoluteUrl, BRAND } from '@/lib/brand';
import { APP_NAME, SERVER_URL } from '@/lib/constants';
import { getT } from '@/lib/i18n-server';
import { localize } from '@/lib/localize';
import { metaDescription } from '@/lib/seo';
import OpenPanel from './open-panel';

interface PartnerLinkPageProps {
  params: Promise<{ token: string }>;
}

// generateMetadata and the page need the same row: one query per request.
const findPartner = cache((token: string) => prisma.partner.findUnique({ where: { token }, select: { name: true, text: true, icon: true } }));

/** The link sent to the partner shows its mercadillo's name and sign in WhatsApp, not the shop's logo. */
export async function generateMetadata({ params }: PartnerLinkPageProps): Promise<Metadata> {
  const [{ token }, { t, locale }] = await Promise.all([params, getT()]);
  const robots = { index: false, follow: false };
  const partner = await findPartner(token);
  if (!partner) return { title: { absolute: BRAND.name }, robots };
  const title = t('PARTNER_LINK_TITLE', { name: localize(partner.name, locale), shop: APP_NAME });
  // Without its own sign, the shop's picture, so the preview never stays empty.
  const image = partner.icon ?? BRAND.ogImage ?? BRAND.logo;
  const description = metaDescription(localize(partner.text, locale)) || undefined;
  return {
    // The name of the shop is in it already: no "| Baifo" after it.
    title: { absolute: title },
    description,
    robots,
    openGraph: { siteName: BRAND.name, title, description, locale, images: [absoluteUrl(image, SERVER_URL)] },
  };
}

/** A partner's private link: a page (so WhatsApp can show its preview) that opens the panel in this browser. */
export default async function PartnerLinkPage({ params }: PartnerLinkPageProps) {
  const [{ token }, { locale }] = await Promise.all([params, getT()]);
  const partner = await findPartner(token);
  return <OpenPanel token={token} name={partner ? localize(partner.name, locale) : ''} icon={partner?.icon ?? null} />;
}
