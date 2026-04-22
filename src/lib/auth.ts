import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

export const AUTH_COOKIE_NAME = 'auth_token'

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET environment variable is not set')
  return new TextEncoder().encode(secret)
}

export async function hashPassword(raw: string): Promise<string> {
  return bcrypt.hash(raw, 12)
}

export async function comparePassword(raw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(raw, hash)
}

export async function createAuthToken(payload: { userId: string; email: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getAuthSecret())
}

export async function verifyAuthToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret())
    if (typeof payload.userId === 'string' && typeof payload.email === 'string') {
      return { userId: payload.userId, email: payload.email }
    }
    return null
  } catch {
    return null
  }
}
