/**
 * In-Memory Sliding Window Rate Limiter Middleware
 * Protects auth endpoints against brute-force and DDoS attacks
 */

const rateLimitMap = new Map();

// Periodic cleanup of stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter({ windowMs = 15 * 60 * 1000, maxRequests = 30, message = 'Too many requests, please try again later.' }) {
  return (req, res, next) => {
    // Extract client IP address safely
    const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${req.baseUrl}${req.path}:${rawIp}`;
    const now = Date.now();

    const record = rateLimitMap.get(key);

    if (!record || now > record.resetTime) {
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    record.count += 1;

    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds,
      });
    }

    next();
  };
}

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  maxRequests: 30,          // Max 30 attempts per 15 minutes per IP
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});
