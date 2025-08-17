import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@cebu-health/lib/auth/sessions'

const PUBLIC_ROUTES = ['/login', '/verify']
const API_AUTH_ROUTES = ['/api/auth/otp/request', '/api/auth/otp/verify']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for public assets and auth routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    API_AUTH_ROUTES.includes(pathname)
  ) {
    return NextResponse.next()
  }

  const session = await getSession()

  // Redirect to login if not authenticated and accessing protected route
  if (!session && !PUBLIC_ROUTES.includes(pathname)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect to dashboard if authenticated and accessing public route
  if (session && PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Add user context to headers for API routes
  if (session && pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', session.userId)
    requestHeaders.set('x-user-email', session.email)
    requestHeaders.set('x-user-roles', JSON.stringify(session.roles))
    if (session.facilityId) {
      requestHeaders.set('x-user-facility-id', session.facilityId)
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}