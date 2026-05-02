import crypto from 'crypto';

const base64url = (value: Buffer | string) =>
  Buffer.from(value).toString('base64url');

const getCliTokenSecret = (required = false) => {
  const secret = process.env.CLI_TOKEN_SECRET || process.env.CLERK_SECRET_KEY;
  if (!secret && required) {
    throw new Error('CLI_TOKEN_SECRET or CLERK_SECRET_KEY is required for CLI tokens');
  }
  return secret || null;
};

const sign = (payload: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(payload).digest('base64url');

export const createCliToken = (userId: string) => {
  const ttlSeconds = Number(process.env.CLI_TOKEN_TTL_SECONDS || 7 * 24 * 60 * 60);
  const payload = base64url(JSON.stringify({
    sub: userId,
    typ: 'cli',
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }));
  return `nvcli.${payload}.${sign(payload, getCliTokenSecret(true)!)}`;
};

export const verifyCliToken = (token: string) => {
  const secret = getCliTokenSecret();
  if (!secret) return null;

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'nvcli') return null;

  const [, payload, signature] = parts;
  const expected = sign(payload, secret);
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length || !crypto.timingSafeEqual(provided, expectedBuffer)) {
    return null;
  }

  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (decoded.typ !== 'cli' || typeof decoded.sub !== 'string') return null;
  if (typeof decoded.exp !== 'number' || decoded.exp < Math.floor(Date.now() / 1000)) return null;
  return decoded.sub;
};
