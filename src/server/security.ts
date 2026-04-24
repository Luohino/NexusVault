import { NextFunction, Request, Response } from 'express';
import { getRedisClient, isRedisReady } from './redis.js';

type RateLimitOptions = {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
  shouldLimit?: (req: Request) => boolean;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export const applySecurityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
};

export const createRateLimitMiddleware = ({
  windowMs = 60_000,
  maxRequests = 300,
  keyPrefix = 'global',
  shouldLimit,
}: RateLimitOptions = {}) => {
  const buckets = new Map<string, RateLimitBucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    if (shouldLimit && !shouldLimit(req)) {
      return next();
    }

    const now = Date.now();
    const key = `${keyPrefix}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const redis = getRedisClient();

    const run = async () => {
      if (redis && isRedisReady()) {
        const rateKey = `rate-limit:${key}`;
        const total = await redis.incr(rateKey);
        if (total === 1) {
          await redis.pExpire(rateKey, windowMs);
        }
        if (total > maxRequests) {
          const ttlMs = await redis.pTTL(rateKey);
          res.setHeader('Retry-After', Math.max(1, Math.ceil(ttlMs / 1000)));
          return res.status(429).json({ error: 'Too many requests' });
        }
        return next();
      }

      const current = buckets.get(key);

      if (!current || now >= current.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return next();
      }

      if (current.count >= maxRequests) {
        res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
        return res.status(429).json({ error: 'Too many requests' });
      }

      current.count += 1;
      buckets.set(key, current);
      next();
    };

    run().catch((error) => {
      console.error('Rate limiter error, using fallback:', error);
      const current = buckets.get(key);
      if (!current || now >= current.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return next();
      }
      if (current.count >= maxRequests) {
        res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
        return res.status(429).json({ error: 'Too many requests' });
      }
      current.count += 1;
      buckets.set(key, current);
      next();
    });
  };
};
