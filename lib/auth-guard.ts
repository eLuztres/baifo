import { cache } from 'react'
import { auth, type Session } from '@/auth'
import { redirect } from 'next/navigation'

// One auth() per request: each call reads the session from the database.
// React's cache only dedupes during a render; in server actions it passes through.
export const getSession = cache(() => auth())

// The middleware only sees that a session cookie exists; this checks the session
// is still valid (e.g. the user wasn't deleted) before a page shows user data.
/** For pages that need a signed-in user: sends guests to /sign-in. */
export async function requireUser(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/sign-in')
  return session
}

// For server actions: they are public endpoints, so each one checks the caller
// itself and returns an error instead of redirecting.
export async function getSessionUserId(): Promise<string | undefined> {
  const session = await getSession()
  return session?.user?.id
}

export async function isAdmin() {
  const session = await getSession()
  return session?.user?.role === 'admin'
}

export async function requireAdmin() {
  const session = await getSession()

  if (session?.user?.role !== 'admin') {
    redirect('/admin/unauthorized')
  }

  return session
}
