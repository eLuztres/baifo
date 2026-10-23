import { prisma } from '@/db/prisma';
import { hash, needsRehash } from '@/lib/encrypt';

// Passwords from before the switch to scrypt get the new hash on their next sign-in.
export async function rehashLegacyPassword(userId: string, password: unknown) {
  if (typeof password !== 'string') return;
  const account = await prisma.account.findFirst({ where: { userId, providerId: 'credential' } });
  if (!account?.password || !needsRehash(account.password)) return;
  await prisma.account.update({ where: { id: account.id }, data: { password: await hash(password) } });
}

// Google just proved the email belongs to whoever is signing in. Sign-ups never verify
// emails, so a password, other logins or sessions set up before may belong to someone else.
export async function claimUnverifiedUser(userId: string, googleAccountId: string) {
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.user.updateMany({
      where: { id: userId, emailVerified: false },
      data: { emailVerified: true },
    });
    if (count === 0) return;
    await tx.account.deleteMany({ where: { userId, NOT: { id: googleAccountId } } });
    await tx.session.deleteMany({ where: { userId } });
  });
}
