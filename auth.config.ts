/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextAuthConfig } from 'next-auth'
import { NextResponse } from 'next/server'

export const authConfig = {
  providers: [], // Required by NextAuthConfig type
  callbacks: {
    authorized({ request, auth }: any) {
      // Array of regex patterns of paths we want to protect
      const protectedPaths = [
        /\/shipping-address/,
        /\/payment-method/,
        /\/place-order/,
        /\/profile/,
        /\/user\/(.*)/,
        /\/order\/(.*)/,
        /\/admin/,
      ]

      // Get pathname from the req URL object
      const { pathname } = request.nextUrl
      // Check if user is not authenticated and accessing a protected path
      if (!auth && protectedPaths.some((p) => p.test(pathname))) {
        // Page loads: let NextAuth redirect to /sign-in as usual.
        if (request.method === 'GET') return false
        // Form posts / server actions from a page whose session ended (e.g. the
        // user was deleted): NextAuth's default 307 would re-POST to its sign-in
        // endpoint and fail with MissingCSRF. Send them to /sign-in as a GET.
        const signInUrl = new URL('/sign-in', request.nextUrl.origin)
        signInUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(signInUrl, 303)
      }

      // Check for session cart cookie
      if (!request.cookies.get('sessionCartId')) {
        // Generate new session cart id cookie
        const sessionCartId = crypto.randomUUID()

        // Create new response and add the new headers
        const response = NextResponse.next({
          request: {
            headers: new Headers(request.headers),
          },
        })

        // Set newly generated sessionCartId in the response cookies
        response.cookies.set('sessionCartId', sessionCartId)

        return response
      }

      return true
    },
  },
} satisfies NextAuthConfig
