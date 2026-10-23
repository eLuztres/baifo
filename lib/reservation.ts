// A reservation needs no cleanup job: it only counts while its end lies in the future.

interface Reservable {
  reservedUntil?: Date | string | null;
  reservedById?: string | null;
}

export function isReservationActive(product: Reservable, now = new Date()) {
  return Boolean(product.reservedUntil && new Date(product.reservedUntil) > now);
}

/** True when someone other than `userId` currently holds the ring. */
export function isReservedByOther(product: Reservable, userId?: string, now = new Date()) {
  return isReservationActive(product, now) && product.reservedById !== userId;
}
