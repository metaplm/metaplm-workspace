interface Entry {
  count: number
  resetAt: number
}

class RateLimiter {
  private store = new Map<string, Entry>()

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Returns seconds until reset if rate-limited, false if the request is allowed. */
  check(key: string): number | false {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || entry.resetAt <= now) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs })
      return false
    }

    entry.count++
    if (entry.count > this.max) {
      return Math.ceil((entry.resetAt - now) / 1000)
    }
    return false
  }

  reset(key: string): void {
    this.store.delete(key)
  }
}

// 5 attempts per 15 minutes per IP
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000)
