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

const defaultAllowedOrigins = () =>
  [
    process.env.APP_BASE_URL,
    process.env.APP_URL,
    process.env.PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    'http://localhost:3002',
    'http://127.0.0.1:3002',
  ].filter((value): value is string => Boolean(value));

const normalizeOrigin = (origin: string) => {
  try {
    return new URL(origin).origin;
  } catch {
    return origin;
  }
};

export const createTrustedOriginMiddleware = (allowedOrigins = defaultAllowedOrigins()) => {
  const allowed = new Set(allowedOrigins.map(normalizeOrigin));

  return (req: Request, res: Response, next: NextFunction) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    const origin = req.headers.origin;
    const secFetchSite = req.headers['sec-fetch-site'];
    const hasAuthorization = Boolean(req.headers.authorization);

    if (!origin) {
      if (hasAuthorization && (!secFetchSite || secFetchSite === 'same-origin' || secFetchSite === 'same-site' || secFetchSite === 'none')) {
        return next();
      }
      return res.status(403).json({ error: 'Blocked cross-origin request' });
    }

    if (!allowed.has(normalizeOrigin(origin))) {
      return res.status(403).json({ error: 'Blocked cross-origin request' });
    }

    next();
  };
};

export const requireJsonMutation = (req: Request, res: Response, next: NextFunction) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const contentType = req.headers['content-type'] || '';
  if (!String(contentType).toLowerCase().includes('application/json')) {
    return res.status(415).json({ error: 'JSON requests only' });
  }

  next();
};
