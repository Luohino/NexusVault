import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createApp } from "./src/server/app.js";

async function startServer() {
  const app = await createApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  server.requestTimeout = serverRequestTimeoutMs;
  server.headersTimeout = serverHeadersTimeoutMs;
  server.keepAliveTimeout = serverKeepAliveTimeoutMs;
}

startServer();
