import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { applySecurityHeaders, createRateLimitMiddleware, createTrustedOriginMiddleware, requireJsonMutation } from './security';

describe('security middleware', () => {
  it('adds baseline security headers', async () => {
    const app = express();
    app.use(applySecurityHeaders);
    app.get('/ok', (_req, res) => res.json({ ok: true }));

    const res = await request(app).get('/ok');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('rate limits repeated requests from the same client', async () => {
    const app = express();
    app.use(createRateLimitMiddleware({ windowMs: 60_000, maxRequests: 2 }));
    app.get('/ok', (_req, res) => res.json({ ok: true }));

    expect((await request(app).get('/ok')).status).toBe(200);
    expect((await request(app).get('/ok')).status).toBe(200);

    const blocked = await request(app).get('/ok');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('Too many requests');
  });

  it('blocks cross-origin mutation requests', async () => {
    const app = express();
    app.use(express.json());
    app.use(createTrustedOriginMiddleware(['http://localhost:3002']));
    app.post('/ok', (_req, res) => res.json({ ok: true }));

    const res = await request(app)
      .post('/ok')
      .set('Origin', 'https://evil.example')
      .send({ ok: true });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Blocked cross-origin request');
  });

  it('allows no-origin CLI auth code requests while keeping cross-origin blocking', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api', createTrustedOriginMiddleware(['http://localhost:3002']));
    app.post('/api/auth/cli/code', (_req, res) => res.json({ code: 'test-code' }));
    app.post('/api/write', (_req, res) => res.json({ ok: true }));

    const cliCode = await request(app)
      .post('/api/auth/cli/code')
      .set('Content-Type', 'application/json')
      .send({});

    expect(cliCode.status).toBe(200);
    expect(cliCode.body.code).toBe('test-code');

    const blocked = await request(app)
      .post('/api/write')
      .set('Content-Type', 'application/json')
      .send({});

    expect(blocked.status).toBe(403);
  });

  it('rejects non-json mutation requests', async () => {
    const app = express();
    app.use(requireJsonMutation);
    app.post('/ok', (_req, res) => res.json({ ok: true }));

    const res = await request(app)
      .post('/ok')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('a=1');

    expect(res.status).toBe(415);
    expect(res.body.error).toBe('JSON requests only');
  });
});
