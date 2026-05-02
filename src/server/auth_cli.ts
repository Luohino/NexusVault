
import { Express } from 'express';
import { authenticate } from './api.js';
import { createCliToken } from './cli_tokens.js';
import crypto from 'crypto';

const cliAuths = new Map<string, string>(); // UUID -> Token

export function setupCliAuthRoutes(app: Express) {
  app.post('/api/auth/cli/code', async (req, res) => {
    const code = crypto.randomUUID();
    cliAuths.set(code, 'PENDING');
    setTimeout(() => cliAuths.delete(code), 10 * 60 * 1000); // 10 min timeout
    res.json({ code });
  });

  app.post('/api/auth/cli/authorize', authenticate, async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Missing code' });
    if (!cliAuths.has(code)) return res.status(404).json({ error: 'Invalid or expired code' });
    cliAuths.set(code, createCliToken((req as any).userId));
    res.json({ success: true });
  });

  app.get('/api/auth/cli/poll/:code', async (req, res) => {
    const { code } = req.params;
    const token = cliAuths.get(code);
    if (!token) return res.status(404).json({ status: 'expired' });
    if (token === 'PENDING') return res.json({ status: 'pending' });
    cliAuths.delete(code);
    res.json({ status: 'authorized', token });
  });
}
