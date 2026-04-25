import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyToken } from '@clerk/backend';
import { createTrustedOriginMiddleware, requireJsonMutation } from './security.js';

const { selectQueue, dbMock } = vi.hoisted(() => {
  const queue: any[] = [];

  const createQuery = (result: any) => ({
    from() { return this; },
    where() { return this; },
    leftJoin() { return this; },
    innerJoin() { return this; },
    orderBy() { return this; },
    groupBy() { return this; },
    offset() { return this; },
    limit() { return Promise.resolve(result); },
    then(resolve: any) { return Promise.resolve(result).then(resolve); },
  });

  return {
    selectQueue: queue,
    dbMock: {
      select: vi.fn(() => createQuery(queue.shift() ?? [])),
      transaction: vi.fn(async (callback: any) => callback({
        select: vi.fn(() => createQuery(queue.shift() ?? [])),
        insert: vi.fn(() => ({
          values: vi.fn(async () => {}),
          onConflictDoNothing: vi.fn(async () => {}),
          onConflictDoUpdate: vi.fn(async () => {}),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(async () => {}),
          })),
        })),
        delete: vi.fn(() => ({
          where: vi.fn(async () => {}),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(async () => {}),
        onConflictDoNothing: vi.fn(async () => {}),
        onConflictDoUpdate: vi.fn(async () => {}),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(async () => {}),
        })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(async () => {}),
      })),
    },
  };
});

vi.mock('./db.js', () => ({
  db: dbMock,
}));

vi.mock('./supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: new Error('no-user') })),
    },
    storage: {
      getBucket: vi.fn(async () => ({ data: { id: 'release-assets' } })),
      createBucket: vi.fn(async () => ({ error: null })),
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ error: null })),
        remove: vi.fn(async () => ({ error: null })),
        createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'http://example.com/file' }, error: null })),
      })),
    },
  },
}));

vi.mock('@clerk/backend', () => ({
  createClerkClient: vi.fn(() => ({})),
  verifyToken: vi.fn(async (token: string) => ({ sub: token })),
}));

import { setupApiRoutes } from './api.js';

describe('repository api integration', () => {
  beforeEach(() => {
    selectQueue.length = 0;
    dbMock.select.mockClear();
    dbMock.transaction.mockClear();
    dbMock.insert.mockClear();
    dbMock.update.mockClear();
    dbMock.delete.mockClear();
  });

  const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api', createTrustedOriginMiddleware(['http://localhost:3002']));
    app.use('/api', requireJsonMutation);
    setupApiRoutes(app);
    return app;
  };

  it('blocks unauthenticated reads of private repositories', async () => {
    selectQueue.push(
      [{ id: 'owner', username: 'alice', avatarUrl: null, displayName: 'Alice' }],
      [{ id: 'repo-1', ownerId: 'owner', name: 'vault', isPrivate: true }]
    );

    const res = await request(createApp()).get('/api/repos/alice/vault');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Repository access denied');
  });

  it('blocks direct writes to a protected default branch', async () => {
    selectQueue.push(
      [{ id: 'owner', username: 'alice' }],
      [{ id: 'repo-1', ownerId: 'owner', name: 'vault', isPrivate: false }],
      [{ repositoryId: 'repo-1', protectMainBranch: true, requirePullRequest: false, defaultBranch: 'main' }]
    );

    const res = await request(createApp())
      .post('/api/repos/alice/vault/files')
      .set('Authorization', 'Bearer owner')
      .send({ path: 'README.md', content: '# hi', branch: 'main' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('main is protected');
  });

  it('blocks pull request authors from reviewing their own pull request', async () => {
    selectQueue.push(
      [{ id: 'owner', username: 'alice' }],
      [{ id: 'repo-1', ownerId: 'owner', name: 'vault', isPrivate: false }],
      [{ id: 'pr-1', repositoryId: 'repo-1', creatorId: 'owner', status: 'open' }]
    );

    const res = await request(createApp())
      .post('/api/repos/alice/vault/pulls/pr-1/reviews')
      .set('Authorization', 'Bearer owner')
      .send({ status: 'approved', comment: 'LGTM' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Pull request authors cannot review their own pull request');
  });

  it('allows write collaborators to commit on feature branches', async () => {
    selectQueue.push(
      [{ id: 'owner', username: 'alice' }],
      [{ id: 'repo-1', ownerId: 'owner', name: 'vault', isPrivate: false }],
      [{ id: 'collab-row', repositoryId: 'repo-1', userId: 'collab', role: 'write' }],
      [{ repositoryId: 'repo-1', protectMainBranch: true, requirePullRequest: true, defaultBranch: 'main' }],
      [{ repositoryId: 'repo-1', defaultBranch: 'main' }],
      [{ id: 'main-branch', repositoryId: 'repo-1', name: 'main' }],
      [{ id: 'feature-branch', repositoryId: 'repo-1', name: 'feature/auth' }],
      []
    );

    const res = await request(createApp())
      .post('/api/repos/alice/vault/files')
      .set('Authorization', 'Bearer collab')
      .send({ path: 'src/index.ts', content: 'export const ok = true;', branch: 'feature/auth' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(dbMock.transaction).toHaveBeenCalled();
  });

  it('rejects invalid bearer tokens instead of unsafe decoding', async () => {
    vi.mocked(verifyToken).mockRejectedValueOnce(new Error('invalid-token'));

    const res = await request(createApp())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer forged.token.payload');

    expect(res.status).toBe(401);
  });

  it('rejects cookie-only authentication on protected routes', async () => {
    const res = await request(createApp())
      .get('/api/auth/me')
      .set('Cookie', 'token=owner');

    expect(res.status).toBe(401);
  });

  it('blocks mutation requests from untrusted origins', async () => {
    const res = await request(createApp())
      .post('/api/auth/logout')
      .set('Origin', 'https://evil.example')
      .set('Content-Type', 'application/json')
      .send({});

    expect(res.status).toBe(403);
  });
});
