import express from "express";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { setupApiRoutes } from "./src/server/api.js";
import { initializeRedis } from "./src/server/redis.js";
import { applySecurityHeaders, createRateLimitMiddleware } from "./src/server/security.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;
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
  app.use("/api", createRateLimitMiddleware({ windowMs: rateLimitWindowMs, maxRequests: rateLimitMaxRequests, keyPrefix: 'api' }));
  app.use("/api/auth", createRateLimitMiddleware({ windowMs: rateLimitWindowMs, maxRequests: authRateLimitMaxRequests, keyPrefix: 'auth' }));
  app.use("/api/search", createRateLimitMiddleware({ windowMs: rateLimitWindowMs, maxRequests: searchRateLimitMaxRequests, keyPrefix: 'search' }));
  app.use("/api", createRateLimitMiddleware({
    windowMs: rateLimitWindowMs,
    maxRequests: writeRateLimitMaxRequests,
    keyPrefix: 'writes',
    shouldLimit: (req) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method),
  }));
  console.log('>>> SERVER BOOT: DATABASE_SYNC_V1 ACTIVE <<<');

  try {
    await initializeRedis();
  } catch (error) {
    console.error('Redis initialization failed, continuing with in-memory fallback:', error);
  }

  // API routes
  setupApiRoutes(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { port: 24679 }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
