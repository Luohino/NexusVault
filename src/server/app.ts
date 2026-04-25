import express from "express";
import cookieParser from "cookie-parser";
import { setupApiRoutes } from "./api.js";
import { initializeRedis } from "./redis.js";
import { applySecurityHeaders, createRateLimitMiddleware, createTrustedOriginMiddleware, requireJsonMutation } from "./security.js";

export async function createApp() {
  const app = express();
  const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || "20mb";
  const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const rateLimitMaxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 300);
  const authRateLimitMaxRequests = Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 30);
  const searchRateLimitMaxRequests = Number(process.env.SEARCH_RATE_LIMIT_MAX_REQUESTS || 60);
  const writeRateLimitMaxRequests = Number(process.env.WRITE_RATE_LIMIT_MAX_REQUESTS || 120);

  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(applySecurityHeaders);
  app.use(express.json({ limit: requestBodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));
  app.use(cookieParser());
  
  app.use("/api", createTrustedOriginMiddleware());
  app.use("/api", requireJsonMutation);
  app.use("/api", createRateLimitMiddleware({ windowMs: rateLimitWindowMs, maxRequests: rateLimitMaxRequests, keyPrefix: 'api' }));
  app.use("/api/auth", createRateLimitMiddleware({ windowMs: rateLimitWindowMs, maxRequests: authRateLimitMaxRequests, keyPrefix: 'auth' }));
  app.use("/api/search", createRateLimitMiddleware({ windowMs: rateLimitWindowMs, maxRequests: searchRateLimitMaxRequests, keyPrefix: 'search' }));
  app.use("/api", createRateLimitMiddleware({
    windowMs: rateLimitWindowMs,
    maxRequests: writeRateLimitMaxRequests,
    keyPrefix: 'writes',
    shouldLimit: (req) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method),
  }));

  try {
    await initializeRedis();
  } catch (error) {
    console.error('Redis initialization failed, continuing with in-memory fallback:', error);
  }

  // API routes
  setupApiRoutes(app);

  return app;
}
