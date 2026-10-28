import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createAuthMiddleware } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { headers } from 'next/headers';
import { prisma } from '@/db/prisma';
import { compare, hash } from '@/lib/encrypt';
import { claimUnverifiedUser, rehashLegacyPassword } from '@/lib/auth-account';
import { claimInviteForSignUp, INVITE_COOKIE } from '@/lib/invites';
import { sendWelcomeEmail } from '@/email';
import { getLocale } from '@/lib/i18n-server';
import { GOOGLE_AUTH_ENABLED, SERVER_URL } from '@/lib/constants';
import { PASSWORD_MIN_LENGTH } from '@/lib/validators';

const SESSION_DAYS = 30;
// Auth endpoints that end with a signed-in user.
const SIGN_IN_PATHS = ['/sign-in/email', '/sign-up/email', '/callback/'];

// A guest who logs in keeps the cart they filled before.
async function moveGuestCartToUser(sessionCartId: string | null | undefined, userId: string) {
  if (!sessionCartId) return;
  const sessionCart = await prisma.cart.findFirst({ where: { sessionCartId } });
  if (!sessionCart || sessionCart.userId === userId) return;
  await prisma.cart.deleteMany({ where: { userId } });
  await prisma.cart.update({ where: { id: sessionCart.id }, data: { userId } });
}

export const authServer = betterAuth({
  // Existing shops keep working with their AUTH_SECRET.
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? SERVER_URL,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  advanced: { database: { generateId: 'uuid' } },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    // The shop's own hash, so passwords from before Better Auth still work.
    password: { hash, verify: ({ hash: storedHash, password }) => compare(password, storedHash) },
  },
  socialProviders: GOOGLE_AUTH_ENABLED
    ? { google: { clientId: process.env.AUTH_GOOGLE_ID!, clientSecret: process.env.AUTH_GOOGLE_SECRET! } }
    : {},
  // Google only returns verified emails, so an existing password account with the same email is linked.
  // Linking an unverified account is safe because the account is claimed right after (see claimUnverifiedUser).
  account: { accountLinking: { enabled: true, trustedProviders: ['google'], requireLocalEmailVerified: false } },
  user: {
    additionalFields: { role: { type: 'string', defaultValue: 'user', input: false } },
  },
  // No cookie cache: every request reads the session from the database, so a deleted
  // user is signed out and a role change applies at once.
  session: { expiresIn: SESSION_DAYS * 24 * 60 * 60 },
  // Guards /api/auth/* (the shop's own forms call the server API, limited in user.actions.ts). In the database,
  // since each Vercel instance would keep its own count in memory. Off in development, as Better Auth's default.
  rateLimit: {
    storage: 'database',
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60 * 60, max: 5 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          // Email and Google sign-ups both pass here; server code without a request (scripts) may still create users.
          if (ctx && !(await claimInviteForSignUp(ctx.getCookie(INVITE_COOKIE) ?? undefined, user.email))) return false;
          return { data: { ...user, name: user.name || user.email.split('@')[0] } };
        },
        // Awaited (capped at 5 s) so the email goes out before the redirect that follows sign-up.
        after: async (user) => {
          await sendWelcomeEmail({ email: user.email, name: user.name }, await getLocale());
        },
      },
    },
    account: {
      create: {
        after: async (account) => {
          if (account.providerId === 'google') await claimUnverifiedUser(account.userId, account.id);
        },
      },
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const newSession = ctx.context.newSession;
      if (!newSession || !SIGN_IN_PATHS.some((path) => ctx.path.startsWith(path))) return;
      await moveGuestCartToUser(ctx.getCookie('sessionCartId'), newSession.user.id);
      if (ctx.path === '/sign-in/email') await rehashLegacyPassword(newSession.user.id, ctx.body?.password);
    }),
  },
  plugins: [nextCookies()],
});

export type Session = typeof authServer.$Infer.Session;

/** The signed-in user's session ({ user: { id, name, email, role } }) or null. */
export async function auth() {
  return authServer.api.getSession({ headers: await headers() });
}
