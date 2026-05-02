import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import os from "os";
import cluster from "cluster";
import { createApp } from "./src/server/app.js";

async function startServer() {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && cluster.isPrimary) {
    const numCPUs = os.cpus().length;
    console.log(`Sovereign Scaling: Primary process ${process.pid} is running. Forking for ${numCPUs} CPUs...`);

    // BUG FIX: Track respawn timestamps to prevent crash-loop fork storms.
    // A worker that crashes more than 5 times in 60 seconds gets a 10s backoff
    // before the next fork, preventing unbounded resource exhaustion.
    const respawnLog: number[] = [];
    const MAX_RESPAWNS_PER_WINDOW = 5;
    const RESPAWN_WINDOW_MS = 60_000;
    const BACKOFF_MS = 10_000;

    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
      console.error(`Institutional Warning: Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}). Reviving...`);

      const now = Date.now();
      // Purge timestamps outside the rolling window
      while (respawnLog.length > 0 && now - respawnLog[0] > RESPAWN_WINDOW_MS) {
        respawnLog.shift();
      }
      respawnLog.push(now);

      if (respawnLog.length > MAX_RESPAWNS_PER_WINDOW) {
        console.error(`CRITICAL: Worker crash loop detected (${respawnLog.length} restarts in ${RESPAWN_WINDOW_MS / 1000}s). Backing off ${BACKOFF_MS / 1000}s before next fork.`);
        setTimeout(() => cluster.fork(), BACKOFF_MS);
      } else {
        cluster.fork();
      }
    });
    return;
  }

  const app = await createApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;
  const publicUrl = (
    process.env.PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    process.env.APP_URL ||
    "https://nexusvault-luohino.vercel.app"
  ).replace(/\/+$/, "");
  const serverRequestTimeoutMs = Number(process.env.SERVER_REQUEST_TIMEOUT_MS || 30_000);
  const serverHeadersTimeoutMs = Number(process.env.SERVER_HEADERS_TIMEOUT_MS || 35_000);
  const serverKeepAliveTimeoutMs = Number(process.env.SERVER_KEEPALIVE_TIMEOUT_MS || 5_000);

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
    app.use(express.static(distPath, {
      maxAge: '1d',
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    const displayUrl = isProd ? publicUrl : `http://localhost:${PORT}`;
    console.log(`Server running on ${displayUrl}`);
  });
  server.requestTimeout = serverRequestTimeoutMs;
  server.headersTimeout = serverHeadersTimeoutMs;
  server.keepAliveTimeout = serverKeepAliveTimeoutMs;
}

startServer();
