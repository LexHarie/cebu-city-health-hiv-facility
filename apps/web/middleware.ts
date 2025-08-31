import { NextRequest, NextResponse } from 'next/server'
import { decodeSessionToken } from '@cebu-health/lib/auth/edge'
import { authRateLimit, generalRateLimit } from '@cebu-health/lib/rate-limit'

const PUBLIC_ROUTES = ['/login', '/verify']
const API_AUTH_ROUTES = ['/api/auth/otp/request', '/api/auth/otp/verify']
const PROTECTED_API_ROUTES = ['/api/clients', '/api/labs', '/api/prescriptions', '/api/dispenses']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Debug logging
  console.log(`Middleware: ${pathname}, NODE_ENV: ${process.env.NODE_ENV}, BYPASS_AUTH: ${process.env.BYPASS_AUTH}`)
  
  // Skip middleware for public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Apply rate limiting to auth endpoints
  if (API_AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    const rateLimitResult = await authRateLimit(request);
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many requests",
          resetTime: rateLimitResult.resetTime
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimitResult.resetTime).toISOString(),
            "Retry-After": Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }
    
    return NextResponse.next()
  }

  // Bypass authentication in development mode
  const isDev = process.env.NODE_ENV === 'development'
  const bypassAuth = process.env.BYPASS_AUTH === 'true' || process.env.DEV_MODE === 'true'
  
  if (isDev && bypassAuth) {
    // Skip auth for all routes except login/verify pages in dev mode
    if (!PUBLIC_ROUTES.includes(pathname) && !API_AUTH_ROUTES.some(route => pathname.startsWith(route))) {
      // Add fake user headers for API routes
      if (pathname.startsWith('/api/')) {
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-user-id', 'dev-user-id')
        requestHeaders.set('x-user-email', 'lexthegreat223@gmail.com')
        requestHeaders.set('x-user-roles', JSON.stringify(['DIRECTOR']))
        
        return NextResponse.next({
          request: {
            headers: requestHeaders
          }
        })
      }
      return NextResponse.next()
    }
    
    // In dev mode, redirect from login to dashboard
    if (PUBLIC_ROUTES.includes(pathname)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Load session for protected routes (decode JWT cookie in middleware)
  async function getSessionFromCookie(req: NextRequest) {
    const token = req.cookies.get('cebu-health-session')?.value
    if (!token) return null
    return decodeSessionToken(token)
  }
  const session = await getSessionFromCookie(request)

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

  // Apply general rate limiting to protected API routes
  if (session && PROTECTED_API_ROUTES.some(route => pathname.startsWith(route))) {
    const rateLimitResult = await generalRateLimit(request);
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          resetTime: rateLimitResult.resetTime
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      );
    }
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
