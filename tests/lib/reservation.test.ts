import { isReservationActive, isReservedByOther } from '@/lib/reservation';

const now = new Date('2026-10-16T12:00:00Z');
const inOneHour = new Date('2026-10-16T13:00:00Z');
const anHourAgo = new Date('2026-10-16T11:00:00Z');

describe('isReservationActive', () => {
  it('is active only while the end lies in the future', () => {
    expect(isReservationActive({ reservedUntil: inOneHour }, now)).toBe(true);
    expect(isReservationActive({ reservedUntil: anHourAgo }, now)).toBe(false);
    expect(isReservationActive({ reservedUntil: null }, now)).toBe(false);
  });

  it('accepts dates that went through JSON as strings', () => {
    expect(isReservationActive({ reservedUntil: inOneHour.toISOString() }, now)).toBe(true);
  });
});

describe('isReservedByOther', () => {
  const reserved = { reservedUntil: inOneHour, reservedById: 'customer-a' };

  it('blocks everyone except the customer who reserved', () => {
    expect(isReservedByOther(reserved, 'customer-b', now)).toBe(true);
    expect(isReservedByOther(reserved, undefined, now)).toBe(true);
    expect(isReservedByOther(reserved, 'customer-a', now)).toBe(false);
  });

  it('frees the ring for everyone once the reservation has ended', () => {
    expect(isReservedByOther({ ...reserved, reservedUntil: anHourAgo }, 'customer-b', now)).toBe(false);
  });
});
