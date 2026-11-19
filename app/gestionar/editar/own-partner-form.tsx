'use client';

import { useRouter } from 'next/navigation';
import PartnerForm, { type EditablePartner } from '@/components/admin/partner-form';
import type { Locale } from '@/lib/i18n-core';
import { adminTexts } from '@/lib/marketplace/admin-texts';
import { PARTNER_PANEL_PATH } from '@/lib/partner-paths';

interface OwnPartnerFormProps {
  locale: Locale;
  locales: Locale[];
  partner: EditablePartner;
}

/** The partner's own details, saved and back to the panel. */
export default function OwnPartnerForm({ locale, locales, partner }: OwnPartnerFormProps) {
  const router = useRouter();
  const backToPanel = () => {
    router.push(PARTNER_PANEL_PATH);
    router.refresh();
  };
  return <PartnerForm locales={locales} partner={partner} isAdminForm={false} texts={adminTexts(locale)} onSaved={backToPanel} onCancel={() => router.push(PARTNER_PANEL_PATH)} />;
}
