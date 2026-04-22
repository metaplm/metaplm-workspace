/**
 * One-time migration: upgrades SHA256 password hashes to bcrypt.
 * Run with: npx ts-node --project tsconfig.json scripts/migrate-passwords.ts
 */
import { createHash } from 'crypto'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const LEGACY_SHA256_RE = /^[0-9a-f]{64}$/

async function main() {
  const users = await prisma.user.findMany()
  let migrated = 0

  for (const user of users) {
    if (!LEGACY_SHA256_RE.test(user.passwordHash)) {
      console.log(`[skip] ${user.email} — already bcrypt`)
      continue
    }

    // We cannot reverse SHA256, so we need the plaintext password.
    // If you know the password, pass it via environment variable MIGRATE_PASSWORD.
    const plaintext = process.env.MIGRATE_PASSWORD
    if (!plaintext) {
      console.warn(`[warn] ${user.email} — SHA256 hash found but MIGRATE_PASSWORD not set. Skipping.`)
      console.warn('       Set MIGRATE_PASSWORD=<password> and re-run to migrate this user.')
      continue
    }

    const sha = createHash('sha256').update(plaintext).digest('hex')
    if (sha !== user.passwordHash) {
      console.warn(`[warn] ${user.email} — MIGRATE_PASSWORD does not match stored SHA256. Skipping.`)
      continue
    }

    const newHash = await bcrypt.hash(plaintext, 12)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })
    console.log(`[ok]   ${user.email} — migrated to bcrypt`)
    migrated++
  }

  console.log(`\nDone. ${migrated} user(s) migrated.`)
  console.log('Note: SHA256→bcrypt auto-upgrade also happens at next login for unmigrated users.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
