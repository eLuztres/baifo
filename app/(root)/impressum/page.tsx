import LegalPage from '@/components/shared/legal-page';
import { BRAND } from '@/lib/brand';
import { getT } from '@/lib/i18n-server';

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t('IMPRINT_TITLE') };
}

export default async function ImprintPage() {
  const { t } = await getT();
  return <LegalPage title={t('IMPRINT_TITLE')} text={t('IMPRINT_TEXT', { shop: BRAND.name })} />;
}
