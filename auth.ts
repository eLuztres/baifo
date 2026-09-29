/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/db/prisma'
import { cookies } from 'next/headers'
import { compare } from './lib/encrypt'
import CredentialsProvider from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { sendWelcomeEmail } from '@/email'
import { getLocale } from '@/lib/i18n-server'
import { GOOGLE_AUTH_ENABLED } from '@/lib/constants'

export const config = {
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    // Reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from the environment.
    // Google only returns verified emails, so an existing password account with
    // the same email is linked instead of rejected.
    ...(GOOGLE_AUTH_ENABLED ? [Google({ allowDangerousEmailAccountLinking: true })] : []),
    CredentialsProvider({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        if (credentials == null) return null

        // Find user in database
        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email as string,
          },
        })

        // Check if user exists and if the password matches
        if (user && user.password) {
          const isMatch = await compare(
            credentials.password as string,
            user.password
          )

          // If password is correct, return user
          if (isMatch) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            }
          }
        }
        // If user does not exist or password does not match return null
        return null
      },
    }),
  ],
  events: {
    // Fires only when the adapter creates a brand-new user (first Google login),
    // not on later logins or when Google links to an existing account.
    async createUser({ user }: any) {
      if (!user?.email) return
      // Awaited on purpose: an after() scheduled from inside Auth.js's OAuth
      // callback never ran, so new Google users got no email. This adds the send
      // time (capped at 5 s) to the very first login only.
      await sendWelcomeEmail(user, await getLocale())
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, user, trigger, token }: any) {
      // Set the user ID from the token
      session.user.id = token.sub
      session.user.role = token.role
      session.user.name = token.name

      // If there is an update, set the user name
      if (trigger === 'update') {
        session.user.name = user.name
      }

      return session
    },
    async jwt({ token, user, trigger, session }: any) {
      // Assign user fields to token
      if (user) {
        token.id = user.id
        token.role = user.role

        // If user has no name then use the email
        if (user.name === 'NO_NAME') {
          token.name = user.email!.split('@')[0]

          // Update database to reflect the token name
          await prisma.user.update({
            where: { id: user.id },
            data: { name: token.name },
          })
        }

        if (trigger === 'signIn' || trigger === 'signUp') {
          const cookiesObject = await cookies()
          const sessionCartId = cookiesObject.get('sessionCartId')?.value

          if (sessionCartId) {
            const sessionCart = await prisma.cart.findFirst({
              where: { sessionCartId },
            })

            if (sessionCart) {
              // Delete current user cart
              await prisma.cart.deleteMany({
                where: { userId: user.id },
              })

              // Assign new cart
              await prisma.cart.update({
                where: { id: sessionCart.id },
                data: { userId: user.id },
              })
            }
          }
        }
      }

      // Handle session updates
      if (session?.user.name && trigger === 'update') {
        token.name = session.user.name
      }

      // Sessions are JWTs, so they outlive a deleted user. Re-check the user
      // at most once a minute: end the session if the user was deleted, and
      // pick up role/name changes (e.g. someone made admin) without re-login.
      if (!user && token.sub) {
        const now = Date.now()
        if (!token.checkedAt || now - token.checkedAt > 60_000) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, name: true },
          })
          if (!dbUser) return null
          token.role = dbUser.role
          token.name = dbUser.name
          token.checkedAt = now
        }
      }

      return token
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
