type RateLimitRecord = {
  count: number;
  resetTime: number;
};

const globalForRateLimit = globalThis as unknown as { rateLimitMap: Map<string, RateLimitRecord> };
const rateLimitMap = globalForRateLimit.rateLimitMap || new Map<string, RateLimitRecord>();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.rateLimitMap = rateLimitMap;
}

/**
 * Basic in-memory rate limiter for development/MVP.
 * NOTE: This will reset on server restarts and is not shared across multi-region deployments.
 */
export const rateLimiter = {
  check: (ip: string, limit: number): { success: boolean; remaining: number; resetTime: number } => {
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    
    if (!record || now > record.resetTime) {
      return { success: true, remaining: limit, resetTime: 0 };
    }
    
    if (record.count >= limit) {
      return { success: false, remaining: 0, resetTime: record.resetTime };
    }
    
    return { success: true, remaining: limit - record.count, resetTime: record.resetTime };
  },

  fail: (ip: string, limit: number, windowMs: number): void => {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    } else {
      record.count += 1;
    }
  },

  reset: (ip: string): void => {
    rateLimitMap.delete(ip);
  }
};
