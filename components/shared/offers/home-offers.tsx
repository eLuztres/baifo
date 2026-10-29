import { isAdmin } from '@/lib/auth-guard';
import { getRunningOffers } from '@/lib/offers';
import OfferAnnouncement from './offer-announcement';

/** The home page's offer announcement; nothing while no offer runs. */
const HomeOffers = async () => {
  const [items, hasAdminButton] = await Promise.all([getRunningOffers(), isAdmin()]);
  return items.length > 0 ? <OfferAnnouncement items={items} hasAdminButton={hasAdminButton} /> : null;
};

export default HomeOffers;
