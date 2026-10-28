import { getRunningOffers } from '@/lib/offers';
import OfferAnnouncement from './offer-announcement';

/** The home page's offer announcement; nothing while no offer runs. */
const HomeOffers = async () => {
  const items = await getRunningOffers();
  return items.length > 0 ? <OfferAnnouncement items={items} /> : null;
};

export default HomeOffers;
