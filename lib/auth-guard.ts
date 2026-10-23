import { cache } from 'react'
import { auth, type Session } from '@/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

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

// An admin can look at the shop as customers see it; the edit tools hide until they switch back.
export const CUSTOMER_VIEW_COOKIE = 'customerView'

export async function isCustomerView() {
  return (await cookies()).get(CUSTOMER_VIEW_COOKIE)?.value === '1'
}

/** Whether the shop's pages show the admin's edit tools. Server actions still check isAdmin(). */
export async function showsAdminTools() {
  const [isAdminUser, isCustomer] = await Promise.all([isAdmin(), isCustomerView()])
  return isAdminUser && !isCustomer
}

export async function requireAdmin() {
  const session = await getSession()

  if (session?.user?.role !== 'admin') {
    redirect('/admin/unauthorized')
  }

  return session
}
