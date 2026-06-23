/**
 * Simple in-memory sliding-window rate limiter.
 * Safe for self-hosted (single-process) Next.js deployments.
 * Not suitable for multi-instance / serverless deployments.
 */

interface WindowEntry {
  timestamps: number[];
  blockedUntil?: number;
}

const store = new Map<string, WindowEntry>();

// Purge stale keys every 10 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (
      (entry.blockedUntil ?? 0) < now &&
      entry.timestamps.every((t) => now - t > 15 * 60 * 1000)
    ) {
      store.delete(key);
    }
  }
}, 10 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * Check and record a hit against a rate limit window.
 *
 * @param key         Unique identifier (IP address or email)
 * @param maxRequests Maximum allowed requests within the window
 * @param windowMs    Window duration in milliseconds
 * @param blockMs     How long to block after limit is exceeded (defaults to windowMs)
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  blockMs = windowMs
): RateLimitResult {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // If currently hard-blocked, reject immediately
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  // Slide the window: drop timestamps older than windowMs
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    entry.blockedUntil = now + blockMs;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(blockMs / 1000),
    };
  }

  entry.timestamps.push(now);
  return { allowed: true };
}
