#!/usr/bin/env node
// Gives an account admin rights: npm run make-admin -- someone@example.com
// If the account is gone (e.g. another admin deleted it), it is created again as admin; then sign in with Google.
// Uses DATABASE_URL from .env (or the environment). For the live shop:
//   vercel env run -e production -- npm run make-admin -- someone@example.com
import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run make-admin -- <email>');
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } });
    console.log(`✓ ${user.email} is now an admin. Reload /admin.`);
  } else {
    // Verified, so a later Google sign-in with this email links to it instead of treating it as a stranger's.
    await prisma.user.create({ data: { email, name: email.split('@')[0], role: 'admin', emailVerified: true } });
    console.log(`✓ ${email} was created again as an admin. Sign in with Google using this email.`);
  }
} finally {
  await prisma.$disconnect();
}
