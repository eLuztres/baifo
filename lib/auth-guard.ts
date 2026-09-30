import { auth } from '@/auth'
import { redirect } from 'next/navigation'

// For server actions: they are public endpoints, so each one checks the caller
// itself and returns an error instead of redirecting.
export async function isAdmin() {
  const session = await auth();
  return session?.user?.role === 'admin';
}

export async function requireAdmin() {
  const session = await auth()

  if (session?.user?.role !== 'admin') {
    redirect('/admin/unauthorized')
  }

  return session
}
