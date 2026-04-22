const BLOCKED = [
  /^localhost$/,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,          // link-local / AWS IMDS
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,    // unique local IPv6
  /^fe80:/i,              // link-local IPv6
  /^metadata\.google\.internal$/,
]

/** Returns true if the URL is safe to fetch (public HTTP/HTTPS, non-private IP). */
export function isAllowedUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
  } catch {
    return false
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false

  const host = url.hostname.toLowerCase()
  return !BLOCKED.some(re => re.test(host))
}
