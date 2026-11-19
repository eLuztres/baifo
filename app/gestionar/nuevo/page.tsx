import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import StartListing from '@/components/marketplace/start-listing';
import { getLocale } from '@/lib/i18n-server';
import { listingTypeOf } from '@/lib/constants';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { getSignedInPartner } from '@/lib/partner-access';
import { PARTNER_PANEL_PATH } from '@/lib/partner-paths';

export async function generateMetadata(): Promise<Metadata> {
  return { title: adminTexts(await getLocale()).newListing };
}

interface PartnerNewListingPageProps {
  /** `tipo=eventos`: an event; anything else: an anuncio. */
  searchParams: Promise<{ tipo?: string }>;
}

/** "+ Anuncio" and "+ Evento" in the panel: a draft opens at once and the editor takes over. */
export default async function PartnerNewListingPage({ searchParams }: PartnerNewListingPageProps) {
  const [partner, locale, { tipo }] = await Promise.all([getSignedInPartner(), getLocale(), searchParams]);
  if (!partner) redirect(PARTNER_PANEL_PATH);
  return <StartListing type={listingTypeOf(tipo) === 'EVENT' ? 'EVENT' : 'PRODUCT'} texts={adminTexts(locale)} isPartner />;
}
