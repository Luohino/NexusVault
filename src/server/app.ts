import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import { setupApiRoutes } from "./api.js";
import { setupCliAuthRoutes } from "./auth_cli.js";
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
  app.use(compression());
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

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "nexusvault",
      environment: process.env.NODE_ENV || "development",
      appUrl: process.env.PUBLIC_APP_URL || process.env.APP_BASE_URL || process.env.APP_URL || "https://nexusvault-luohino.vercel.app",
    });
  });

  try {
    console.log('Sovereign Ingestion: Initializing application core...');
    if (!process.env.DATABASE_URL) {
      console.error('CRITICAL: DATABASE_URL is missing from environment.');
    }
    await initializeRedis();
    console.log('Sovereign Ingestion: Core systems operational.');
  } catch (error) {
    console.error('Institutional Warning: Core initialization anomaly:', error);
  }

  // API routes
  setupApiRoutes(app);
  setupCliAuthRoutes(app);

  return app;
}
