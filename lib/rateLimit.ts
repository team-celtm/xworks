const ipCache = new Map<string, { count: number; resetAt: number }>();

/**
 * Returns true if the IP exceeds the request limit, otherwise false.
 * Default: Max 5 requests per 15 minutes.
 */
export function isRateLimited(ip: string, limit = 5, durationMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const cache = ipCache.get(ip);
  if (!cache || now > cache.resetAt) {
    ipCache.set(ip, { count: 1, resetAt: now + durationMs });
    return false;
  }
  if (cache.count >= limit) {
    return true;
  }
  cache.count += 1;
  return false;
}
