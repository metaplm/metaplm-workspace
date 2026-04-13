import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/api/auth/login', '/api/auth/logout']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }

  // API routes: allow browser sessions (cookie) OR valid API key header
  if (pathname.startsWith('/api/')) {
    const apiKey = process.env.METAPLM_API_KEY
    const providedKey = request.headers.get('x-api-key')
    const hasCookie = !!request.cookies.get('auth_token')?.value

    // If an API key is configured, require either a valid key or a browser cookie
    if (apiKey && !hasCookie && providedKey !== apiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.next()
  }

  // Check if auth cookie exists
  const token = request.cookies.get('auth_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Cookie exists, allow access
  // JWT verification will happen in API routes if needed
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|metaplm_logo_2.png).*)'],
}
