import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, comparePassword, createAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth'
import { loginRateLimiter } from '@/lib/rate-limiter'

const LEGACY_SHA256_RE = /^[0-9a-f]{64}$/

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const retryAfter = loginRateLimiter.check(ip)
    if (retryAfter !== false) {
      return NextResponse.json(
        { error: 'Too many login attempts' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      )
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    let valid = false

    if (LEGACY_SHA256_RE.test(user.passwordHash)) {
      // Legacy SHA256 hash — compare and silently upgrade to bcrypt on success
      valid = createHash('sha256').update(password).digest('hex') === user.passwordHash
      if (valid) {
        const newHash = await hashPassword(password)
        await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })
      }
    } else {
      valid = await comparePassword(password, user.passwordHash)
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    loginRateLimiter.reset(ip)

    const token = await createAuthToken({ userId: user.id, email: user.email })
    const response = NextResponse.json({ success: true })

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
