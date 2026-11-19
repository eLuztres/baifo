import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AdminListingWorkspace from '@/components/marketplace/admin-listing-workspace';
import { getLocale, getShopLocale } from '@/lib/i18n-server';
import { localize } from '@/lib/localize';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { getSignedInPartner } from '@/lib/partner-access';
import { PARTNER_PANEL_PATH } from '@/lib/partner-paths';

export async function generateMetadata(): Promise<Metadata> {
  return { title: adminTexts(await getLocale()).editListing };
}

// "Crear foto" and "Cambiar esta foto" wait for the AI inside the action's time.
export const maxDuration = 300;

interface PartnerListingPageProps {
  params: Promise<{ id: string }>;
}

/** One of the partner's listings in the listing editor; another one's listing isn't found (the workspace checks). */
export default async function PartnerListingPage({ params }: PartnerListingPageProps) {
  const [partner, locale, { id }] = await Promise.all([getSignedInPartner(), getLocale(), params]);
  if (!partner) redirect(PARTNER_PANEL_PATH);
  return (
    <div className='space-y-3 sm:space-y-4'>
      <AdminListingWorkspace
        id={id}
        locale={locale}
        texts={adminTexts(locale)}
        partner={{ name: localize(partner.name, getShopLocale()), contactPhone: partner.contactPhone }}
      />
    </div>
  );
}
