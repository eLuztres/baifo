import { prisma } from '@/db/prisma';

// Stored in the database, not in memory: Vercel runs many instances, and each would keep its own count.
export interface RateLimit {
  /** What is limited, e.g. "contact"; each action counts on its own. */
  action: string;
  max: number;
  windowMs: number;
}

/** Counts this request for the IP and says whether it goes over the limit; blocked requests aren't counted. */
export async function isRateLimited({ action, max, windowMs }: RateLimit, ip: string) {
  const windowStart = new Date(Date.now() - windowMs);
  const hits = await prisma.rateLimitHit.count({ where: { action, ip, createdAt: { gt: windowStart } } });
  if (hits >= max) return true;
  await prisma.$transaction([
    prisma.rateLimitHit.deleteMany({ where: { action, createdAt: { lte: windowStart } } }),
    prisma.rateLimitHit.create({ data: { action, ip } }),
  ]);
  return false;
}
