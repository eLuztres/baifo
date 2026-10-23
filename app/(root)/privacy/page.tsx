import LegalPage from '@/components/shared/legal-page';
import { BRAND } from '@/lib/brand';
import { getT } from '@/lib/i18n-server';
import { SHOWCASE_MODE } from '@/lib/constants';

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t('PRIVACY_TITLE') };
}

export default async function PrivacyPage() {
  const { t } = await getT();
  return <LegalPage title={t('PRIVACY_TITLE')} text={t(SHOWCASE_MODE ? 'PRIVACY_TEXT_SHOWCASE' : 'PRIVACY_TEXT', { shop: BRAND.name })} />;
}
