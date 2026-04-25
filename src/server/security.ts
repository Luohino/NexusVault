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
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Sovereign CSP: Authorizing Clerk, Google OAuth, and Platform Assets
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://*.clerk.accounts.dev https://clerk.com https://accounts.google.com http://localhost:* http://127.0.0.1:*",
    "worker-src 'self' blob:",
    "connect-src 'self' ws://localhost:* wss://localhost:* ws://127.0.0.1:* wss://127.0.0.1:* https://*.clerk.accounts.dev https://*.supabase.co wss://*.clerk.accounts.dev https://accounts.google.com",
    "img-src 'self' data: blob: https://*.clerk.com https://img.clerk.com https://github.com https://*.githubusercontent.com https://*.googleusercontent.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    "font-src 'self' https://fonts.gstatic.com",
    "frame-src 'self' https://*.clerk.accounts.dev https://accounts.google.com"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
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
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined,
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

  // Allow empty-body mutations (e.g. star/unstar, simple toggles)
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength === 0 && !req.headers['content-type']) {
    return next();
  }

  const contentType = req.headers['content-type'] || '';
  if (!String(contentType).toLowerCase().includes('application/json')) {
    return res.status(415).json({ error: 'JSON requests only' });
  }

  next();
};
