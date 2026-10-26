import { prisma } from '@/db/prisma';

// Better Auth's own rate limit only guards its HTTP routes, not the server action that signs in.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

const windowStart = () => new Date(Date.now() - WINDOW_MS);

/** The visitor's IP as Vercel passes it on. */
export const clientIp = (requestHeaders: Headers) =>
  requestHeaders.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

/** True after MAX_FAILURES wrong passwords for this email from this IP within the window. */
export async function isSignInBlocked(email: string, ip: string) {
  const failures = await prisma.failedSignIn.count({ where: { email, ip, createdAt: { gt: windowStart() } } });
  return failures >= MAX_FAILURES;
}

export async function recordFailedSignIn(email: string, ip: string) {
  await prisma.$transaction([
    prisma.failedSignIn.deleteMany({ where: { createdAt: { lte: windowStart() } } }),
    prisma.failedSignIn.create({ data: { email, ip } }),
  ]);
}

export async function clearFailedSignIns(email: string, ip: string) {
  await prisma.failedSignIn.deleteMany({ where: { email, ip } });
}
