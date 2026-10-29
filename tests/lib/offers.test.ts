import { fromShopDateTime } from '@/lib/event-date';
import { isOfferRunning, localizeOffer, offerStatus, runningOfferWhere } from '@/lib/offers-core';
import { offerSchema } from '@/lib/validators';

const ZONE = 'Atlantic/Canary';
// The shop's clock: winter time is UTC, summer time UTC+1.
const shopTime = (value: string) => fromShopDateTime(value, ZONE)!;

const OFFER = {
  startsAt: shopTime('2026-11-01T09:00'),
  endsAt: shopTime('2026-11-30T23:59'),
  isActive: true,
};

describe('an offer shows only between its start and end', () => {
  it('is upcoming before it starts', () => {
    expect(offerStatus(OFFER, new Date('2026-11-01T08:59:00Z'))).toBe('upcoming');
    expect(isOfferRunning(OFFER, new Date('2026-10-31T12:00:00Z'))).toBe(false);
  });

  it('runs from its start to just before its end', () => {
    expect(offerStatus(OFFER, new Date('2026-11-01T09:00:00Z'))).toBe('running');
    expect(isOfferRunning(OFFER, new Date('2026-11-15T12:00:00Z'))).toBe(true);
    expect(isOfferRunning(OFFER, new Date('2026-11-30T23:58:59Z'))).toBe(true);
  });

  it('has ended from its end on, also when it was switched off', () => {
    expect(offerStatus(OFFER, new Date('2026-11-30T23:59:00Z'))).toBe('ended');
    expect(offerStatus({ ...OFFER, isActive: false }, new Date('2026-12-05T00:00:00Z'))).toBe('ended');
  });

  it('is hidden while switched off, even inside its dates', () => {
    expect(offerStatus({ ...OFFER, isActive: false }, new Date('2026-11-15T12:00:00Z'))).toBe('hidden');
  });

  it('starts and ends on the island clock, in summer an hour before UTC', () => {
    const summer = { startsAt: shopTime('2026-07-01T00:00'), endsAt: shopTime('2026-07-31T23:59'), isActive: true };
    expect(summer.startsAt.toISOString()).toBe('2026-06-30T23:00:00.000Z');
    // Midnight on the island is still 30 June in UTC, and the offer already runs.
    expect(isOfferRunning(summer, new Date('2026-06-30T23:30:00Z'))).toBe(true);
    expect(isOfferRunning(summer, new Date('2026-06-30T22:59:00Z'))).toBe(false);
    expect(isOfferRunning(summer, new Date('2026-07-31T22:59:00Z'))).toBe(false);
  });

  it('asks the database for the same window', () => {
    const now = new Date('2026-11-15T12:00:00Z');
    expect(runningOfferWhere(now)).toEqual({ isActive: true, startsAt: { lte: now }, endsAt: { gt: now } });
  });
});

describe('localizeOffer', () => {
  const stored = {
    id: 'offer-1',
    icon: 'GraduationCap',
    title: { es: 'Estudiantes gratis', en: 'Free for students' },
    text: { es: 'Publica gratis' },
    audience: {},
    linkUrl: null,
    image: null,
    endsAt: new Date('2026-11-30T23:59:00Z'),
  };

  it("shows the visitor's language, else the shop's text", () => {
    expect(localizeOffer(stored, 'en')).toMatchObject({ title: 'Free for students', text: 'Publica gratis', audience: '' });
  });

  it('falls back to a known icon', () => {
    expect(localizeOffer({ ...stored, icon: 'Bomb' }, 'es').icon).toBe('Megaphone');
  });
});

describe('offerSchema', () => {
  const input = {
    title: 'Para estudiantes',
    text: 'Un mes gratis',
    audience: '',
    icon: 'GraduationCap' as const,
    linkUrl: '/explore',
    startsAt: '2026-07-01T00:00',
    endsAt: '2026-07-31T23:59',
    sortOrder: 0,
    isActive: true,
  };

  it('reads the dates on the shop clock', () => {
    const offer = offerSchema.parse(input);
    expect(offer.startsAt).toEqual(fromShopDateTime('2026-07-01T00:00'));
    expect(offer.linkUrl).toBe('/explore');
  });

  it('refuses an end before the start, a missing date and a foreign link', () => {
    expect(offerSchema.safeParse({ ...input, endsAt: '2026-06-30T10:00' }).success).toBe(false);
    expect(offerSchema.safeParse({ ...input, startsAt: '' }).success).toBe(false);
    expect(offerSchema.safeParse({ ...input, linkUrl: '//evil.example' }).success).toBe(false);
    expect(offerSchema.safeParse({ ...input, linkUrl: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('drops an empty link', () => {
    expect(offerSchema.parse({ ...input, linkUrl: '' }).linkUrl).toBeNull();
  });
});
