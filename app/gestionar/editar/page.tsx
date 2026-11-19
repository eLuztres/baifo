import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getEnabledLocales, getShopLocale, getT } from '@/lib/i18n-server';
import type { LocalizedText } from '@/lib/localize';
import { getSignedInPartner } from '@/lib/partner-access';
import { PARTNER_PANEL_PATH } from '@/lib/partner-paths';
import OwnPartnerForm from './own-partner-form';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('PARTNER_EDIT_TITLE') };
}

/** The partner changes its mercadillo's name, words, sign and WhatsApp. */
export default async function PartnerEditPage() {
  const [{ t, locale }, partner] = await Promise.all([getT(), getSignedInPartner()]);
  if (!partner) redirect(PARTNER_PANEL_PATH);
  const shopLocale = getShopLocale();
  return (
    <div className='mx-auto max-w-2xl space-y-5'>
      <div className='relative text-center'>
        <Link href={PARTNER_PANEL_PATH} aria-label={t('PARTNER_BACK')} className='absolute left-0 top-0.5 flex size-9 items-center justify-center rounded-full border border-border transition hover:border-primary/50'>
          <ArrowLeft className='size-4' />
        </Link>
        <h1 className='font-display text-2xl sm:text-3xl'>{t('PARTNER_EDIT_TITLE')}</h1>
      </div>
      <div className='rounded-3xl border border-border bg-card p-4 sm:p-6'>
        <OwnPartnerForm
          locale={locale}
          locales={[shopLocale, ...getEnabledLocales().filter((enabled) => enabled !== shopLocale)]}
          partner={{
            id: partner.id,
            slug: partner.slug,
            name: partner.name as LocalizedText,
            text: partner.text as LocalizedText,
            icon: partner.icon,
            contactPhone: partner.contactPhone,
            maxListings: partner.maxListings,
          }}
        />
      </div>
    </div>
  );
}
