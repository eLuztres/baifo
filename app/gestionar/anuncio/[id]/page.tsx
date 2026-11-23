import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import AdminListingWorkspace from '@/components/marketplace/admin-listing-workspace';
import { getLocale, getShopLocale, getT } from '@/lib/i18n-server';
import { localize } from '@/lib/localize';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { getSignedInPartner } from '@/lib/partner-access';
import { PARTNER_PANEL_PATH } from '@/lib/partner-paths';

export async function generateMetadata(): Promise<Metadata> {
  return { title: adminTexts(await getLocale()).editListing };
}

// "Crear descripción" waits for the AI inside the action's time.
export const maxDuration = 300;

interface PartnerListingPageProps {
  params: Promise<{ id: string }>;
}

/** One of the partner's listings in the listing editor; another one's listing isn't found (the workspace checks). */
export default async function PartnerListingPage({ params }: PartnerListingPageProps) {
  const [partner, locale, { id }, { t }] = await Promise.all([getSignedInPartner(), getLocale(), params, getT()]);
  if (!partner) redirect(PARTNER_PANEL_PATH);
  return (
    // The way back beside the editor's title, as on "Editar tu mercadillo": no need for the browser's back.
    // The title keeps room on both sides for the arrow, so longer languages never run under it.
    <div className='relative mx-auto max-w-xl space-y-3 sm:space-y-4 [&_h1]:px-11'>
      <Link
        href={PARTNER_PANEL_PATH}
        aria-label={t('PARTNER_BACK')}
        title={t('PARTNER_BACK')}
        className='absolute left-0 top-0 z-10 flex size-9 items-center justify-center rounded-full border border-border bg-background transition hover:border-primary/50 sm:top-0.5'
      >
        <ArrowLeft className='size-4' />
      </Link>
      <AdminListingWorkspace
        id={id}
        locale={locale}
        texts={adminTexts(locale)}
        partner={{ name: localize(partner.name, getShopLocale()), contactPhone: partner.contactPhone }}
      />
    </div>
  );
}
