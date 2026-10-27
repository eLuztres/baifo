import { LISTING_TYPE_KEYS, LISTING_TYPE_PARAMS, LISTING_TYPES, listingTypeOf, newListingPath } from '@/lib/constants';
import { getTranslator, LOCALES } from '@/lib/i18n';
import { feedCardLabels } from '@/lib/listing-labels';
import { adminTexts } from '@/lib/marketplace/admin-texts';

const t = getTranslator('es');

describe('listing types', () => {
  it('are the four types in the order of the admin tabs', () => {
    expect(LISTING_TYPES).toEqual(['PRODUCT', 'WANTED', 'SERVICE', 'EVENT']);
  });

  it('read a link name back as its type, and nothing else', () => {
    for (const type of LISTING_TYPES) expect(listingTypeOf(LISTING_TYPE_PARAMS[type])).toBe(type);
    expect(listingTypeOf('busco')).toBe('WANTED');
    expect(listingTypeOf('servicios')).toBe('SERVICE');
    expect(listingTypeOf('casa')).toBeUndefined();
    expect(listingTypeOf(undefined)).toBeUndefined();
  });

  it('start a new admin listing of their own type', () => {
    expect(newListingPath('PRODUCT')).toBe('/admin/listings/new');
    expect(newListingPath('WANTED')).toBe('/admin/listings/new?tipo=busco');
    expect(listingTypeOf(new URL(newListingPath('EVENT'), 'http://x').searchParams.get('tipo'))).toBe('EVENT');
  });

  it('have a name in every language, for the feed and for the admin', () => {
    for (const { id } of LOCALES) {
      for (const type of LISTING_TYPES) {
        expect(getTranslator(id)(LISTING_TYPE_KEYS[type])).not.toBe(LISTING_TYPE_KEYS[type]);
        expect(adminTexts(id)[`type_${type}`]).toBeTruthy();
      }
    }
    expect(t(LISTING_TYPE_KEYS.WANTED)).toBe('Busco');
  });
});

describe('feedCardLabels', () => {
  const now = new Date('2026-11-26T10:00:00Z');
  const base = { price: '20.00', isFromPrice: false, serviceType: null, startsAt: null };

  it('shows nothing extra for an item for sale', () => {
    expect(feedCardLabels({ ...base, type: 'PRODUCT' }, t, 'es', now)).toEqual({ priceLabel: undefined, priceText: undefined, badge: undefined });
  });

  it('marks a wanted ad and its budget', () => {
    expect(feedCardLabels({ ...base, type: 'WANTED' }, t, 'es', now)).toMatchObject({ priceLabel: t('WANTED_BUDGET'), badge: t('EXPLORE_WANTED_BADGE') });
  });

  it('shows a service\'s kind of offer and its "from" price', () => {
    expect(feedCardLabels({ ...base, type: 'SERVICE', isFromPrice: true, serviceType: 'class' }, t, 'es', now)).toMatchObject({
      priceLabel: t('PRICE_FROM'),
      badge: t('SERVICE_TYPE_CLASS'),
    });
  });

  it('shows an event\'s day and "free" without an entry price', () => {
    const labels = feedCardLabels({ ...base, type: 'EVENT', price: undefined, startsAt: new Date('2026-11-26T19:00:00Z') }, t, 'es', now);
    expect(labels.badge).toContain(t('EVENT_TODAY'));
    expect(labels.priceText).toBe(t('EVENT_FREE'));
  });
});
