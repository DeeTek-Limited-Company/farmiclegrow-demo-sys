/**
 * Simple in-memory rate limiter.
 * Note: In a production serverless environment, this should be replaced 
 * with a distributed store like Redis or Upstash.
 */

const cache = new Map<string, { count: number; expires: number }>();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export interface WriteRateLimitPolicyInput {
  pathname: string;
  method: string;
  ip: string;
  userId?: string | null;
}

export interface WriteRateLimitPolicy {
  key: string;
  limit: number;
  windowMs: number;
}

export function getWriteRateLimitPolicy({
  pathname,
  method,
  ip,
  userId,
}: WriteRateLimitPolicyInput): WriteRateLimitPolicy | null {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return null;
  }

  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/signup") ||
    pathname.startsWith("/api/auth")
  ) {
    return null;
  }

  const actorKey = userId ? `user:${userId}` : `ip:${ip}`;

  if (pathname === "/api/farmers" || pathname.startsWith("/api/farmers/")) {
    return {
      key: `write:onboarding:${actorKey}`,
      limit: 180,
      windowMs: 60_000,
    };
  }

  return {
    key: `write:general:${actorKey}`,
    limit: 80,
    windowMs: 60_000,
  };
}

/**
 * Functional API for rate limiting (consumes one token)
 */
export function rateLimit(
  key: string, 
  limit: number, 
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = cache.get(key);

  if (!entry || now > entry.expires) {
    const expires = now + windowMs;
    cache.set(key, { count: 1, expires });
    return { success: true, remaining: limit - 1, reset: expires };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.expires };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, reset: entry.expires };
}

/**
 * Object-oriented API for rate limiting (used in login/middleware)
 */
export const rateLimiter = {
  /**
   * Non-incrementing check. 
   * Returns whether the key is currently within limits.
   */
  check: (key: string, limit: number, windowMs: number = 60000) => {
    const now = Date.now();
    const entry = cache.get(key);

    if (!entry || now > entry.expires) {
      return { success: true, resetTime: now + windowMs };
    }

    return {
      success: entry.count < limit,
      resetTime: entry.expires,
    };
  },

  /**
   * Increments the counter for the key.
   */
  fail: (key: string, limit: number, windowMs: number = 60000) => {
    const result = rateLimit(key, limit, windowMs);
    return {
      success: result.success,
      resetTime: result.reset,
    };
  },

  /**
   * Resets the counter for the key.
   */
  reset: (key: string) => {
    cache.delete(key);
  }
};

/**
 * Cleanup expired entries to prevent memory leaks.
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expires) {
        cache.delete(key);
      }
    }
  }, 60000); // Every minute
}
