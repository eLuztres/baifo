import { Metadata } from 'next';
import type { CorralDraft } from '@/components/admin/corral-form';
import PlaceAdmin from '@/components/admin/place-admin';
import { requireAdmin } from '@/lib/auth-guard';
import { localize } from '@/lib/category';
import { getShopLocale, getT } from '@/lib/i18n-server';
import { getPlaces, getShopPlaces } from '@/lib/places';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('PLACES_ADMIN_TITLE') };
}

/** The towns of the island: the admin opens one (live), names it and puts its pin on the map. */
const PlacesPage = async () => {
  await requireAdmin();
  const { t, locale } = await getT();
  const [places, stored] = await Promise.all([getShopPlaces(locale), getPlaces()]);
  // The Corral's texts as the admin wrote them: in the shop's language.
  const shopLocale = getShopLocale();
  const corrals = Object.fromEntries(
    stored.flatMap(({ id, corral }) => {
      if (!corral) return [];
      const draft: CorralDraft = {
        name: corral.name,
        address: corral.address,
        venue: corral.venue ?? '',
        text: localize(corral.text, shopLocale),
        hours: localize(corral.hours, shopLocale),
        lat: corral.lat,
        lng: corral.lng,
        hostName: corral.hostName ?? '',
        hostImage: corral.hostImage ?? '',
        image: corral.image ?? '',
        whatsapp: corral.whatsapp ?? '',
        phone: corral.phone ?? '',
        email: corral.email ?? '',
      };
      return [[id, draft]];
    })
  );

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <h2 className='h2-bold'>{t('PLACES_ADMIN_TITLE')}</h2>
        <p className='max-w-2xl text-muted-foreground'>{t('PLACES_ADMIN_INTRO')}</p>
      </div>
      <PlaceAdmin places={places} corrals={corrals} />
    </div>
  );
};

export default PlacesPage;
