import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth'

const PUBLIC_ROUTES = ['/login', '/api/auth/login', '/api/auth/logout']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_ROUTES.includes(pathname)) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    const apiKey = process.env.METAPLM_API_KEY
    const providedKey = request.headers.get('x-api-key')
    const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value

    const hasValidCookie = cookieToken ? !!(await verifyAuthToken(cookieToken)) : false
    const hasValidApiKey = !!(apiKey && providedKey === apiKey)

    if (!hasValidCookie && !hasValidApiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.next()
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  if (!token || !(await verifyAuthToken(token))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|metaplm_logo_2.png).*)'],
}
