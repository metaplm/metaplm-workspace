'use server'

import { createHash } from 'crypto'
import jwt from 'jsonwebtoken'

export const AUTH_COOKIE_NAME = 'auth_token'

interface AuthPayload {
  userId: string
  email: string
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is not set')
  }
  return secret
}

export function hashPassword(raw: string) {
  return createHash('sha256').update(raw).digest('hex')
}

export function createAuthToken(payload: AuthPayload) {
  return jwt.sign(payload, getAuthSecret(), { expiresIn: '7d' })
}

export function verifyAuthToken(token: string) {
  try {
    return jwt.verify(token, getAuthSecret()) as AuthPayload
  } catch (err) {
    return null
  }
}
