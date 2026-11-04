import { Metadata } from 'next';
import MercadilloAdmin from '@/components/admin/mercadillo-admin';
import { requireAdmin } from '@/lib/auth-guard';
import type { LocalizedText } from '@/lib/category';
import { getEnabledLocales, getShopLocale, getT } from '@/lib/i18n-server';
import { getMercadillos } from '@/lib/mercadillos';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('MERCADILLOS_ADMIN_TITLE') };
}

/** The Mercadillos: the admin makes and changes them here, and adds listings to them in each listing's editor. */
const MercadillosPage = async () => {
  await requireAdmin();
  const { t, locale } = await getT();
  const mercadillos = await getMercadillos();
  const shopLocale = getShopLocale();

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <h2 className='h2-bold'>{t('MERCADILLOS_ADMIN_TITLE')}</h2>
        <p className='max-w-2xl text-muted-foreground'>{t('MERCADILLOS_ADMIN_INTRO')}</p>
      </div>
      <MercadilloAdmin
        locale={locale}
        locales={[shopLocale, ...getEnabledLocales().filter((enabled) => enabled !== shopLocale)]}
        mercadillos={mercadillos.map(({ id, slug, name, text, image, icon, _count }) => ({
          id,
          slug,
          name: name as LocalizedText,
          text: text as LocalizedText,
          image,
          icon,
          productCount: _count.products,
        }))}
      />
    </div>
  );
};

export default MercadillosPage;
