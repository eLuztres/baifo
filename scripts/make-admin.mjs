#!/usr/bin/env node
// Gives an existing account admin rights: npm run make-admin -- someone@example.com
// Sign up in the shop first; uses DATABASE_URL from .env (or the environment).
import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run make-admin -- <email of an existing account>');
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (!user) {
    console.error(`No account with ${email}. Sign up in the shop first, then run this again.`);
    process.exit(1);
  }
  await prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } });
  console.log(`✓ ${user.email} is now an admin. Sign out and in again to see /admin.`);
} finally {
  await prisma.$disconnect();
}
