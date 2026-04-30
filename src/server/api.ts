import { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { db } from './db.js';
import { users, repositories, commits, files, fileVersions, issues, issueComments, stars, followers, tags, releases, releaseAssets, branches, branchFiles, pullRequests, repositoryTopics, repositorySettings, wikiPages, pullRequestReviews, repositoryCollaborators, repositoryInvitations, notifications } from './schema.js';
import { eq, and, or, ilike, desc, sql, inArray } from 'drizzle-orm';
import { detectLanguage } from './utils/language.js';
import { canReviewPullRequest, countApprovedReviews, evaluateDirectWritePolicy, getDefaultBranchName } from './repositoryRules.js';
import crypto from 'crypto';
import { supabaseAdmin } from './supabase.js';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { getOrSetCachedRepositoryJson, invalidateRepositoryCache } from './redis.js';
import { INPUT_LIMITS, ValidationError, readBoolean, readBranchName, readInteger, readOptionalString, readRepoName, readRepoPath, readSafeUrl, readSearchQuery, readString, readStringArray, readUsername } from './validation.js';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Middleware to authenticate user using Supabase
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Try Clerk verification first (using the provided secret key)
    // We use verifyToken for Bearer tokens
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (payload && payload.sub) {
      (req as any).userId = payload.sub;
      return next();
    }

    // Try Supabase fallback (original logic)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (!error && user) {
      (req as any).userId = user.id;
      return next();
    } else if (error) {
      console.error('Supabase fallback auth error:', error.message);
    }

    console.error('Auth failed: Token was invalid for both Clerk and Supabase');
    return res.status(401).json({ error: 'Invalid token' });
  } catch (err) {
    console.error('Auth error (verifyToken):', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  
  if (!token) return next();

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    
    if (payload && payload.sub) {
      (req as any).userId = payload.sub;
      return next();
    }
  } catch (err) {
    try {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        (req as any).userId = user.id;
      }
    } catch (supabaseError) {}
  }
  next();
};

export function setupApiRoutes(app: Express) {
  const releaseBucket = process.env.SUPABASE_RELEASES_BUCKET || 'release-assets';

  const ensureReleaseStorageBucket = async () => {
    try {
      const { data: bucket } = await supabaseAdmin.storage.getBucket(releaseBucket);
      if (!bucket) {
        const { error } = await supabaseAdmin.storage.createBucket(releaseBucket, { public: false });
        if (error && !error.message.toLowerCase().includes('already exists')) {
          console.error('Release bucket creation error:', error);
        }
      }
    } catch (error) {
      console.error('Release bucket setup error:', error);
    }
  };

  const releaseBucketReady = ensureReleaseStorageBucket();

  // Dynamic Sitemap Generator for Search Engines
  app.get(['/sitemap.xml', '/api/sitemap.xml'], async (req: Request, res: Response) => {
    try {
      const allUsers = await db.select({ username: users.username }).from(users);
      const allRepos = await db.select({ 
        username: users.username, 
        repoName: repositories.name,
        updatedAt: repositories.updatedAt 
      }).from(repositories).innerJoin(users, eq(repositories.ownerId, users.id));

      const baseUrl = 'https://nexusvault-luohino.vercel.app';
      const lastMod = new Date().toISOString().split('T')[0];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

      // Add user profiles
      allUsers.forEach(u => {
        xml += `
  <url>
    <loc>${baseUrl}/${u.username}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      });

      // Add repositories
      allRepos.forEach(r => {
        const repoDate = r.updatedAt ? new Date(r.updatedAt).toISOString().split('T')[0] : lastMod;
        xml += `
  <url>
    <loc>${baseUrl}/${r.username}/${r.repoName}</loc>
    <lastmod>${repoDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
      });

      xml += '\n</urlset>';

      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error('Sitemap generation error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  const getRepositoryForRequest = async (username: string, repoName: string) => {
    const user = await db.select().from(users).where(ilike(users.username, username)).limit(1);
    if (user.length === 0) return { error: 'User not found' as const };

    const repo = await db.select().from(repositories)
      .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, repoName)))
      .limit(1);
    if (repo.length === 0) return { error: 'Repository not found' as const };

    return { owner: user[0], repo: repo[0] };
  };

  const canWriteRepository = async (repo: any, userId: string) => {
    if (repo.ownerId === userId) return true;
    const collaborator = await db.select().from(repositoryCollaborators)
      .where(and(eq(repositoryCollaborators.repositoryId, repo.id), eq(repositoryCollaborators.userId, userId)))
      .limit(1);
    return ['write', 'admin'].includes(collaborator[0]?.role || '');
  };

  const canReadRepository = async (repo: any, userId?: string | null) => {
    if (!repo.isPrivate) return true;
    if (!userId) return false;
    if (repo.ownerId === userId) return true;
    const collaborator = await db.select().from(repositoryCollaborators)
      .where(and(eq(repositoryCollaborators.repositoryId, repo.id), eq(repositoryCollaborators.userId, userId)))
      .limit(1);
    return collaborator.length > 0;
  };

  const requireRepositoryReadAccess = async (repo: any, userId: string | null | undefined, res: Response) => {
    if (await canReadRepository(repo, userId)) return true;
    res.status(403).json({ error: 'Repository access denied' });
    return false;
  };

  const getRepositoryDefaultBranch = async (repoId: string) => {
    const settings = await db.select().from(repositorySettings)
      .where(eq(repositorySettings.repositoryId, repoId))
      .limit(1);
    return getDefaultBranchName(settings[0]);
  };

  const enforceDirectWritePolicy = async (
    repo: any,
    branchName: string,
    res: Response
  ) => {
    const settings = await db.select().from(repositorySettings)
      .where(eq(repositorySettings.repositoryId, repo.id))
      .limit(1);
    const decision = evaluateDirectWritePolicy(settings[0], branchName);
    if (decision.allowed) return true;
    if ('error' in decision) {
      res.status(409).json({ error: decision.error });
    } else {
      res.status(409).json({ error: 'Direct writes are blocked on this branch' });
    }
    return false;
  };

  const sendRepositoryInviteEmail = async ({ to, inviteeUsername, inviterUsername, repoPath, role }: any) => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || 'NexusVault <noreply@nexusvault.local>';
    const appUrl = process.env.APP_BASE_URL || 'http://localhost:3002';
    if (!apiKey || !to) {
      console.log(`[email skipped] Invite ${inviteeUsername} <${to}> to ${repoPath} as ${role}. Configure RESEND_API_KEY and EMAIL_FROM to send email.`);
      return { sent: false, reason: !apiKey ? 'missing_resend_api_key' : 'missing_recipient_email' };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          subject: `${inviterUsername} invited you to ${repoPath}`,
          html: `<p>Hi ${inviteeUsername},</p><p>${inviterUsername} invited you as a <strong>${role}</strong> collaborator on <strong>${repoPath}</strong>.</p><p><a href="${appUrl}/${repoPath}">Open NexusVault</a> and accept the invite from notifications.</p>`,
        }),
      });
      if (!response.ok) {
        const reason = await response.text();
        console.error('Invite email failed:', reason);
        return { sent: false, reason };
      }
      return { sent: true };
    } catch (error) {
      console.error('Invite email error:', error);
      return { sent: false, reason: 'send_failed' };
    }
  };

  const ensureMainBranch = async (repoId: string, ownerId: string) => {
    const existing = await db.select().from(branches)
      .where(and(eq(branches.repositoryId, repoId), eq(branches.name, 'main')))
      .limit(1);
    if (existing.length > 0) return existing[0];

    const latestCommit = await db.select().from(commits)
      .where(eq(commits.repositoryId, repoId))
      .orderBy(desc(commits.timestamp))
      .limit(1);
    const branchId = crypto.randomUUID();
    await db.insert(branches).values({
      id: branchId,
      repositoryId: repoId,
      name: 'main',
      baseBranch: 'main',
      createdFromCommitId: latestCommit[0]?.id || null,
      creatorId: ownerId,
    });
    return (await db.select().from(branches).where(eq(branches.id, branchId)).limit(1))[0];
  };

  const getBranch = async (repoId: string, ownerId: string, name = 'main') => {
    await ensureMainBranch(repoId, ownerId);
    const branch = await db.select().from(branches)
      .where(and(eq(branches.repositoryId, repoId), eq(branches.name, name)))
      .limit(1);
    return branch[0] || null;
  };

  const getFilesForBranch = async (repoId: string, ownerId: string, branchName = 'main') => {
    if (branchName === 'main') {
      return await db.select({
        id: files.id,
        path: files.path,
        content: files.content,
        lastCommitId: files.lastCommitId,
        lastCommitMessage: commits.message,
        lastCommitTimestamp: commits.timestamp,
      })
      .from(files)
      .leftJoin(commits, eq(files.lastCommitId, commits.id))
      .where(eq(files.repositoryId, repoId))
      .orderBy(files.path);
    }

    const branch = await getBranch(repoId, ownerId, branchName);
    if (!branch) return null;

    return await db.select({
      id: branchFiles.id,
      path: branchFiles.path,
      content: branchFiles.content,
      lastCommitId: branchFiles.lastCommitId,
      lastCommitMessage: commits.message,
      lastCommitTimestamp: commits.timestamp,
    })
    .from(branchFiles)
    .leftJoin(commits, eq(branchFiles.lastCommitId, commits.id))
    .where(eq(branchFiles.branchId, branch.id))
    .orderBy(branchFiles.path);
  };

  const cacheRepositoryRead = async <T>(
    repoId: string,
    suffix: string,
    loader: () => Promise<T>
  ) => getOrSetCachedRepositoryJson(repoId, suffix, loader);

  const handleRequestError = (res: Response, error: unknown, message: string) => {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    console.error(message, error);
    return res.status(500).json({ error: 'Internal server error' });
  };

  // --- Auth Routes ---
  app.post('/api/auth/sync', authenticate, async (req, res) => {
    try {
      const id = readString(req.body.id, { field: 'id', maxLength: 128, allowEmpty: false });
      const username = readUsername(req.body.username);
      const email = readString(req.body.email, {
        field: 'email',
        maxLength: 254,
        allowEmpty: false,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      });
      const avatarUrl = readSafeUrl(req.body.avatarUrl, 'avatar URL');

      // Check if user exists
      const existingUser = await db.select().from(users).where(eq(users.id, id)).limit(1);
      
      if (existingUser.length === 0) {
        await db.insert(users).values({
          id,
          username,
          email,
          password: 'EXTERNAL_AUTH', // Managed by Supabase/Clerk
          displayName: username,
          avatarUrl: avatarUrl || null,
          bio: '',
          joinedAt: new Date(),
        });
      } else {
        // Update avatar if changed
        if (avatarUrl && existingUser[0].avatarUrl !== avatarUrl) {
          await db.update(users).set({ avatarUrl }).where(eq(users.id, id));
        }
      }

      const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
      res.json(user[0]);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      console.error('CRITICAL SYNC ERROR:', error);
      res.status(500).json({ error: 'Sync failed' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        joinedAt: users.joinedAt
      }).from(users).where(eq(users.id, userId)).limit(1);
      
      if (user.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user[0]);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- User Routes ---
  app.get('/api/users/:username', optionalAuthenticate, async (req, res) => {
    try {
      const userResult = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const dbUser = userResult[0];
      
      // 0. Statistics & Recent Activity
      const followersResult = await db.select({ count: sql<number>`count(*)` })
        .from(followers).where(eq(followers.followingId, dbUser.id));
      const followingResult = await db.select({ count: sql<number>`count(*)` })
        .from(followers).where(eq(followers.followerId, dbUser.id));

      const allRecentCommits = await db.select({
        id: commits.id,
        message: commits.message,
        timestamp: commits.timestamp,
        repoName: repositories.name,
        repositoryId: repositories.id,
        repoOwnerId: repositories.ownerId,
        repoIsPrivate: repositories.isPrivate,
      })
      .from(commits)
      .innerJoin(repositories, eq(commits.repositoryId, repositories.id))
      .where(eq(commits.authorId, dbUser.id))
      .orderBy(desc(commits.timestamp))
      .limit(10);
      const currentUserId = (req as any).userId;
      const recentCommits = [];
      for (const commit of allRecentCommits) {
        if (await canReadRepository({ id: commit.repositoryId, ownerId: commit.repoOwnerId, isPrivate: commit.repoIsPrivate }, currentUserId)) {
          recentCommits.push({
            id: commit.id,
            message: commit.message,
            timestamp: commit.timestamp,
            repoName: commit.repoName,
          });
        }
      }

      // 1. Fetch Special Repo (README)
      const specialRepo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, dbUser.id), ilike(repositories.name, dbUser.username)))
        .limit(1);

      let profileReadme = null;
      if (specialRepo.length > 0 && await canReadRepository(specialRepo[0], currentUserId)) {
        const readmeFile = await db.select().from(files)
          .where(and(eq(files.repositoryId, specialRepo[0].id), ilike(files.path, 'README.md')))
          .limit(1);
        if (readmeFile.length > 0) {
          profileReadme = readmeFile[0].content;
        }
      }

      // 2. Fetch Contributions for Heatmap (Last 365 days)
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);
      const oneYearAgoStr = oneYearAgo.toISOString();

      const contributions = await db.select({
        date: sql<string>`date_trunc('day', ${commits.timestamp})`,
        count: sql<number>`count(*)`
      })
      .from(commits)
      .where(and(
        eq(commits.authorId, dbUser.id), 
        sql`${commits.timestamp} >= ${oneYearAgoStr}::timestamp`
      ))
      .groupBy(sql`date_trunc('day', ${commits.timestamp})`);

      // 3. Calculate Tech Stack (Languages from repos)
      const allUserRepos = await db.select().from(repositories).where(eq(repositories.ownerId, dbUser.id));
      const userRepos = [];
      for (const repo of allUserRepos) {
        if (await canReadRepository(repo, currentUserId)) {
          userRepos.push(repo);
        }
      }
      const languages = Array.from(new Set(userRepos.map(r => 'JavaScript'))); // Simplified for now

      // 4. Stars count
      const starsResult = await db.select({ count: sql<number>`count(*)` })
        .from(stars)
        .where(eq(stars.userId, dbUser.id));

      // 5. Check if current user is following
      let isFollowing = false;
      if (currentUserId) {
        const followCheck = await db.select().from(followers)
          .where(and(eq(followers.followerId, currentUserId), eq(followers.followingId, dbUser.id)))
          .limit(1);
        isFollowing = followCheck.length > 0;
      }
      
      res.json({
        ...dbUser,
        followersCount: Number(followersResult[0]?.count || 0),
        followingCount: Number(followingResult[0]?.count || 0),
        starsCount: Number(starsResult[0]?.count || 0),
        recentCommits,
        profileReadme,
        contributions: contributions.map(c => ({ 
          date: new Date(c.date).toISOString().split('T')[0], 
          count: Number(c.count) 
        })),
        languages,
        isFollowing
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/users/:username', authenticate, async (req, res) => {
    try {
      const displayName = readOptionalString(req.body.displayName, { field: 'display name', maxLength: INPUT_LIMITS.displayName });
      const bio = readOptionalString(req.body.bio, { field: 'bio', maxLength: INPUT_LIMITS.bio });
      const location = readOptionalString(req.body.location, { field: 'location', maxLength: INPUT_LIMITS.location });
      const pronouns = readOptionalString(req.body.pronouns, { field: 'pronouns', maxLength: INPUT_LIMITS.pronouns });
      const userId = (req as any).userId;

      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0 || user[0].id !== userId) return res.status(403).json({ error: 'Unauthorized' });

      await db.update(users)
        .set({ displayName, bio, location, pronouns })
        .where(eq(users.id, userId));

      res.json({ success: true });
    } catch (error) {
      handleRequestError(res, error, 'User profile update error:');
    }
  });

  app.post('/api/users/:username/follow', authenticate, async (req, res) => {
    try {
      const followerId = (req as any).userId;
      const targetUser = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      
      if (targetUser.length === 0) return res.status(404).json({ error: 'User not found' });
      const followingId = targetUser[0].id;

      if (followerId === followingId) return res.status(400).json({ error: 'Cannot follow yourself' });

      await db.insert(followers).values({ followerId, followingId }).onConflictDoNothing();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/users/:username/follow', authenticate, async (req, res) => {
    try {
      const followerId = (req as any).userId;
      const targetUser = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      
      if (targetUser.length === 0) return res.status(404).json({ error: 'User not found' });
      const followingId = targetUser[0].id;

      await db.delete(followers).where(and(eq(followers.followerId, followerId), eq(followers.followingId, followingId)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/notifications', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const items = await db.select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        href: notifications.href,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        invitationId: repositoryInvitations.id,
        invitationStatus: repositoryInvitations.status,
        invitationRole: repositoryInvitations.role,
        actorUsername: users.username,
        actorAvatarUrl: users.avatarUrl,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.actorId, users.id))
      .leftJoin(repositoryInvitations, eq(repositoryInvitations.notificationId, notifications.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(20);
      res.json(items);
    } catch (error) {
      console.error('Notifications fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/notifications/:notificationId/read', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      await db.update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, req.params.notificationId), eq(notifications.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      console.error('Notification read error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/notifications/:notificationId/accept', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const invite = await db.select().from(repositoryInvitations)
        .where(and(
          eq(repositoryInvitations.notificationId, req.params.notificationId),
          eq(repositoryInvitations.inviteeId, userId)
        ))
        .limit(1);
      if (invite.length === 0) return res.status(404).json({ error: 'Invitation not found' });
      if (invite[0].status !== 'pending') return res.status(400).json({ error: 'Invitation is no longer pending' });

      const existing = await db.select().from(repositoryCollaborators)
        .where(and(eq(repositoryCollaborators.repositoryId, invite[0].repositoryId), eq(repositoryCollaborators.userId, userId)))
        .limit(1);
      const now = new Date();
      await db.transaction(async (tx) => {
        if (existing.length === 0) {
          await tx.insert(repositoryCollaborators).values({
            id: crypto.randomUUID(),
            repositoryId: invite[0].repositoryId,
            userId,
            role: invite[0].role,
            invitedById: invite[0].invitedById,
          });
        }

        await tx.update(repositoryInvitations)
          .set({ status: 'accepted', respondedAt: now })
          .where(eq(repositoryInvitations.id, invite[0].id));
        await tx.update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.id, req.params.notificationId));
      });

      await invalidateRepositoryCache(invite[0].repositoryId);
      res.json({ success: true });
    } catch (error) {
      console.error('Invitation accept error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/users/:username/followers', optionalAuthenticate, async (req, res) => {
    try {
      const targetUser = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (targetUser.length === 0) return res.status(404).json({ error: 'User not found' });

      const followerList = await db.select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio
      })
      .from(followers)
      .innerJoin(users, eq(followers.followerId, users.id))
      .where(eq(followers.followingId, targetUser[0].id));

      res.json(followerList);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/users/:username/following', optionalAuthenticate, async (req, res) => {
    try {
      const targetUser = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (targetUser.length === 0) return res.status(404).json({ error: 'User not found' });

      const followingList = await db.select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio
      })
      .from(followers)
      .innerJoin(users, eq(followers.followingId, users.id))
      .where(eq(followers.followerId, targetUser[0].id));

      res.json(followingList);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/users/:username/stars', optionalAuthenticate, async (req, res) => {
    try {
      const targetUser = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (targetUser.length === 0) return res.status(404).json({ error: 'User not found' });

      const starredRepos = await db.select({
        id: repositories.id,
        name: repositories.name,
        description: repositories.description,
        isPrivate: repositories.isPrivate,
        updatedAt: repositories.updatedAt,
        starCount: repositories.starCount,
        ownerUsername: users.username
      })
      .from(stars)
      .innerJoin(repositories, eq(stars.repositoryId, repositories.id))
      .innerJoin(users, eq(repositories.ownerId, users.id))
      .where(eq(stars.userId, targetUser[0].id));

      const currentUserId = (req as any).userId;
      const visibleRepos = [];
      for (const repo of starredRepos) {
        if (await canReadRepository(repo, currentUserId)) {
          visibleRepos.push(repo);
        }
      }

      res.json(visibleRepos);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/star', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const targetUser = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (targetUser.length === 0) return res.status(404).json({ error: 'User not found' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, targetUser[0].id), ilike(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });
      if (!(await canReadRepository(repo[0], userId))) return res.status(403).json({ error: 'Repository access denied' });

      await db.insert(stars).values({ userId, repositoryId: repo[0].id }).onConflictDoNothing();
      
      await db.update(repositories)
        .set({ starCount: sql`${repositories.starCount} + 1` })
        .where(eq(repositories.id, repo[0].id));

      await invalidateRepositoryCache(repo[0].id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/repos/:username/:repoName/star', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const targetUser = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (targetUser.length === 0) return res.status(404).json({ error: 'User not found' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, targetUser[0].id), ilike(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });
      if (!(await canReadRepository(repo[0], userId))) return res.status(403).json({ error: 'Repository access denied' });

      await db.delete(stars).where(and(eq(stars.userId, userId), eq(stars.repositoryId, repo[0].id)));
      
      await db.update(repositories)
        .set({ starCount: sql`GREATEST(0, ${repositories.starCount} - 1)` })
        .where(eq(repositories.id, repo[0].id));

      await invalidateRepositoryCache(repo[0].id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Branch Routes ---
  app.get('/api/repos/:username/:repoName/branches', optionalAuthenticate, async (req, res) => {
    try {
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await requireRepositoryReadAccess(resolved.repo, (req as any).userId, res))) return;
      const repoBranches = await cacheRepositoryRead(resolved.repo.id, 'branches', async () => {
        await ensureMainBranch(resolved.repo.id, resolved.owner.id);
        return await db.select().from(branches)
          .where(eq(branches.repositoryId, resolved.repo.id))
          .orderBy(branches.name);
      });
      res.json(repoBranches);
    } catch (error) {
      console.error('Branches fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/branches', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const name = readBranchName(req.body.name, 'branch name');
      const from = req.body.from === undefined ? 'main' : readBranchName(req.body.from, 'source branch');

      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });

      const duplicate = await db.select().from(branches)
        .where(and(eq(branches.repositoryId, resolved.repo.id), eq(branches.name, name)))
        .limit(1);
      if (duplicate.length > 0) return res.status(400).json({ error: 'Branch already exists' });

      const sourceBranch = await getBranch(resolved.repo.id, resolved.owner.id, from);
      if (!sourceBranch) return res.status(404).json({ error: 'Source branch not found' });
      const sourceFiles = await getFilesForBranch(resolved.repo.id, resolved.owner.id, from);
      if (!sourceFiles) return res.status(404).json({ error: 'Source branch files not found' });

      const branchId = crypto.randomUUID();
      await db.insert(branches).values({
        id: branchId,
        repositoryId: resolved.repo.id,
        name,
        baseBranch: from,
        createdFromCommitId: sourceBranch.createdFromCommitId,
        creatorId: userId,
      });

      for (const file of sourceFiles) {
        await db.insert(branchFiles).values({
          id: crypto.randomUUID(),
          branchId,
          path: file.path,
          content: file.content,
          baseContent: file.content,
          lastCommitId: file.lastCommitId,
        });
      }

      const branch = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
      await invalidateRepositoryCache(resolved.repo.id);
      res.json(branch[0]);
    } catch (error) {
      handleRequestError(res, error, 'Branch creation error:');
    }
  });

  app.patch('/api/repos/:username/:repoName/branches/:branchName', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const nextName = readBranchName(req.body.name, 'branch name');

      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (resolved.repo.ownerId !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const branchName = decodeURIComponent(req.params.branchName);
      const branch = await getBranch(resolved.repo.id, resolved.owner.id, branchName);
      if (!branch) return res.status(404).json({ error: 'Branch not found' });

      const settings = await db.select().from(repositorySettings).where(eq(repositorySettings.repositoryId, resolved.repo.id)).limit(1);
      const defaultBranch = settings[0]?.defaultBranch || 'main';
      if (branchName === defaultBranch) return res.status(400).json({ error: 'Cannot rename the default branch' });

      const duplicate = await db.select().from(branches)
        .where(and(eq(branches.repositoryId, resolved.repo.id), eq(branches.name, nextName)))
        .limit(1);
      if (duplicate.length > 0) return res.status(400).json({ error: 'Branch already exists' });

      await db.update(branches).set({ name: nextName }).where(eq(branches.id, branch.id));
      await db.update(pullRequests).set({ sourceBranch: nextName }).where(and(eq(pullRequests.repositoryId, resolved.repo.id), eq(pullRequests.sourceBranch, branchName)));
      await db.update(pullRequests).set({ targetBranch: nextName }).where(and(eq(pullRequests.repositoryId, resolved.repo.id), eq(pullRequests.targetBranch, branchName)));
      await db.update(commits).set({ branchName: nextName }).where(and(eq(commits.repositoryId, resolved.repo.id), eq(commits.branchName, branchName)));
      await invalidateRepositoryCache(resolved.repo.id);
      res.json({ ...branch, name: nextName });
    } catch (error) {
      handleRequestError(res, error, 'Branch rename error:');
    }
  });

  app.delete('/api/repos/:username/:repoName/branches/:branchName', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (resolved.repo.ownerId !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const branchName = decodeURIComponent(req.params.branchName);
      const settings = await db.select().from(repositorySettings).where(eq(repositorySettings.repositoryId, resolved.repo.id)).limit(1);
      const defaultBranch = settings[0]?.defaultBranch || 'main';
      if (branchName === defaultBranch) return res.status(400).json({ error: 'Cannot delete the default branch' });

      const branch = await getBranch(resolved.repo.id, resolved.owner.id, branchName);
      if (!branch) return res.status(404).json({ error: 'Branch not found' });
      await db.delete(branchFiles).where(eq(branchFiles.branchId, branch.id));
      await db.delete(branches).where(eq(branches.id, branch.id));
      await invalidateRepositoryCache(resolved.repo.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Branch delete error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Repository Metadata Routes ---
  app.get('/api/repos/:username/:repoName/topics', optionalAuthenticate, async (req, res) => {
    try {
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await requireRepositoryReadAccess(resolved.repo, (req as any).userId, res))) return;
      const topics = await cacheRepositoryRead(resolved.repo.id, 'topics', async () => (
        await db.select().from(repositoryTopics)
          .where(eq(repositoryTopics.repositoryId, resolved.repo.id))
          .orderBy(repositoryTopics.name)
      ));
      res.json(topics);
    } catch (error) {
      console.error('Topics fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/repos/:username/:repoName/topics', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (resolved.repo.ownerId !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const topicValues = req.body.topics === undefined ? [] : readStringArray(req.body.topics, {
        field: 'topics',
        itemField: 'topic',
        maxItems: 20,
        maxItemLength: 39,
        pattern: /^#?[a-z0-9][a-z0-9-]{0,38}$/,
      });
      const names = Array.from(new Set<string>(topicValues
        .map((topic: string) => String(topic).trim().toLowerCase().replace(/^#/, ''))
        .filter((topic: string) => /^[a-z0-9][a-z0-9-]{0,38}$/.test(topic))))
        .slice(0, 20);

      await db.delete(repositoryTopics).where(eq(repositoryTopics.repositoryId, resolved.repo.id));
      for (const name of names) {
        await db.insert(repositoryTopics).values({ id: crypto.randomUUID(), repositoryId: resolved.repo.id, name });
      }
      await invalidateRepositoryCache(resolved.repo.id);
      res.json(names.map(name => ({ name })));
    } catch (error) {
      handleRequestError(res, error, 'Topics update error:');
    }
  });

  app.get('/api/repos/:username/:repoName/collaborators', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (resolved.repo.ownerId !== userId) return res.status(403).json({ error: 'Unauthorized' });
      const collaborators = await cacheRepositoryRead(resolved.repo.id, 'collaborators', async () => (
        await db.select({
          id: repositoryCollaborators.id,
          role: repositoryCollaborators.role,
          createdAt: repositoryCollaborators.createdAt,
          username: users.username,
          avatarUrl: users.avatarUrl,
        })
        .from(repositoryCollaborators)
        .leftJoin(users, eq(repositoryCollaborators.userId, users.id))
        .where(eq(repositoryCollaborators.repositoryId, resolved.repo.id))
        .orderBy(desc(repositoryCollaborators.createdAt))
      ));
      res.json(collaborators);
    } catch (error) {
      console.error('Collaborators fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/repos/:username/:repoName/contributors', optionalAuthenticate, async (req, res) => {
    try {
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await requireRepositoryReadAccess(resolved.repo, (req as any).userId, res))) return;
      const contributors = await cacheRepositoryRead(resolved.repo.id, 'contributors', async () => {
        const commitAuthors = await db.select({
          username: users.username,
          avatarUrl: users.avatarUrl,
          count: sql<number>`count(${commits.id})`,
        })
        .from(commits)
        .leftJoin(users, eq(commits.authorId, users.id))
        .where(eq(commits.repositoryId, resolved.repo.id))
        .groupBy(users.username, users.avatarUrl);

        const collaborators = await db.select({
          username: users.username,
          avatarUrl: users.avatarUrl,
        })
        .from(repositoryCollaborators)
        .leftJoin(users, eq(repositoryCollaborators.userId, users.id))
        .where(eq(repositoryCollaborators.repositoryId, resolved.repo.id));

        const contributorMap = new Map<string, any>();
        contributorMap.set(resolved.owner.username, {
          username: resolved.owner.username,
          avatarUrl: resolved.owner.avatarUrl,
          count: 0,
          role: 'owner',
        });
        for (const author of commitAuthors) {
          if (!author.username) continue;
          contributorMap.set(author.username, {
            username: author.username,
            avatarUrl: author.avatarUrl,
            count: Number(author.count || 0),
            role: author.username === resolved.owner.username ? 'owner' : 'contributor',
          });
        }
        for (const collaborator of collaborators) {
          if (!collaborator.username) continue;
          const existing = contributorMap.get(collaborator.username);
          contributorMap.set(collaborator.username, {
            username: collaborator.username,
            avatarUrl: collaborator.avatarUrl,
            count: existing?.count || 0,
            role: existing?.role === 'owner' ? 'owner' : 'collaborator',
          });
        }

        return Array.from(contributorMap.values()).sort((a, b) => (b.count || 0) - (a.count || 0));
      });

      res.json(contributors);
    } catch (error) {
      console.error('Contributors fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/collaborators', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const username = readUsername(req.body.username);
      const role = ['read', 'write', 'admin'].includes(req.body.role) ? req.body.role : 'write';
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (resolved.repo.ownerId !== userId) return res.status(403).json({ error: 'Unauthorized' });
      const invitee = await db.select().from(users).where(ilike(users.username, username)).limit(1);
      if (invitee.length === 0) return res.status(404).json({ error: 'User not found' });
      if (invitee[0].id === resolved.repo.ownerId) return res.status(400).json({ error: 'Owner already has access' });
      const existing = await db.select().from(repositoryCollaborators)
        .where(and(eq(repositoryCollaborators.repositoryId, resolved.repo.id), eq(repositoryCollaborators.userId, invitee[0].id)))
        .limit(1);
      if (existing.length > 0) {
        return res.status(409).json({ error: `${invitee[0].username} is already a collaborator` });
      }
      const pending = await db.select().from(repositoryInvitations)
        .where(and(
          eq(repositoryInvitations.repositoryId, resolved.repo.id),
          eq(repositoryInvitations.inviteeId, invitee[0].id),
          eq(repositoryInvitations.status, 'pending')
        ))
        .limit(1);
      if (pending.length > 0) {
        return res.status(409).json({ error: `${invitee[0].username} already has a pending invite` });
      }
      const id = crypto.randomUUID();
      const notificationId = crypto.randomUUID();
      await db.transaction(async (tx) => {
        await tx.insert(repositoryInvitations).values({
          id,
          repositoryId: resolved.repo.id,
          inviteeId: invitee[0].id,
          invitedById: userId,
          role,
          status: 'pending',
          notificationId,
        });
        await tx.insert(notifications).values({
          id: notificationId,
          userId: invitee[0].id,
          actorId: userId,
          type: 'repository_invite',
          title: `Repository invite: ${resolved.owner.username}/${resolved.repo.name}`,
          body: `${resolved.owner.username} invited you as ${role} collaborator. Accept the invite to join.`,
          href: `/${resolved.owner.username}/${resolved.repo.name}`,
        });
      });
      const emailResult = await sendRepositoryInviteEmail({
        to: invitee[0].email,
        inviteeUsername: invitee[0].username,
        inviterUsername: resolved.owner.username,
        repoPath: `${resolved.owner.username}/${resolved.repo.name}`,
        role,
      });
      await invalidateRepositoryCache(resolved.repo.id);
      res.json({ id, role, status: 'pending', username: invitee[0].username, avatarUrl: invitee[0].avatarUrl, email: emailResult });
    } catch (error) {
      handleRequestError(res, error, 'Collaborator create error:');
    }
  });

  app.delete('/api/repos/:username/:repoName/collaborators/:collaboratorId', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (resolved.repo.ownerId !== userId) return res.status(403).json({ error: 'Unauthorized' });
      const collaborator = await db.select().from(repositoryCollaborators).where(and(
        eq(repositoryCollaborators.repositoryId, resolved.repo.id),
        eq(repositoryCollaborators.id, req.params.collaboratorId)
      )).limit(1);
      if (collaborator.length === 0) return res.status(404).json({ error: 'Collaborator not found' });

      await db.delete(repositoryCollaborators).where(and(
        eq(repositoryCollaborators.repositoryId, resolved.repo.id),
        eq(repositoryCollaborators.id, req.params.collaboratorId)
      ));
      await db.update(repositoryInvitations)
        .set({ status: 'removed', respondedAt: new Date() })
        .where(and(
          eq(repositoryInvitations.repositoryId, resolved.repo.id),
          eq(repositoryInvitations.inviteeId, collaborator[0].userId),
          eq(repositoryInvitations.status, 'accepted')
        ));
      await invalidateRepositoryCache(resolved.repo.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Collaborator delete error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/repos/:username/:repoName/settings', optionalAuthenticate, async (req, res) => {
    try {
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await requireRepositoryReadAccess(resolved.repo, (req as any).userId, res))) return;
      const settings = await cacheRepositoryRead(resolved.repo.id, 'settings', async () => {
        let currentSettings = await db.select().from(repositorySettings)
          .where(eq(repositorySettings.repositoryId, resolved.repo.id)).limit(1);
        if (currentSettings.length === 0) {
          await db.insert(repositorySettings).values({ repositoryId: resolved.repo.id });
          currentSettings = await db.select().from(repositorySettings)
            .where(eq(repositorySettings.repositoryId, resolved.repo.id)).limit(1);
        }
        return currentSettings[0];
      });
      res.json(settings);
    } catch (error) {
      console.error('Settings fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/repos/:username/:repoName/settings', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (resolved.repo.ownerId !== userId) return res.status(403).json({ error: 'Unauthorized' });
      const requestedDefaultBranch = req.body.defaultBranch === undefined ? 'main' : readBranchName(req.body.defaultBranch, 'default branch');
      const defaultBranch = await getBranch(resolved.repo.id, resolved.owner.id, requestedDefaultBranch);
      if (!defaultBranch) return res.status(400).json({ error: 'Default branch not found' });
      const next = {
        protectMainBranch: readBoolean(req.body.protectMainBranch),
        requirePullRequest: readBoolean(req.body.requirePullRequest),
        requiredReviewCount: readInteger(req.body.requiredReviewCount, { field: 'required review count', min: 0, max: 6, defaultValue: 0 }),
        defaultBranch: requestedDefaultBranch,
      };
      await db.insert(repositorySettings).values({ repositoryId: resolved.repo.id, ...next })
        .onConflictDoUpdate({ target: repositorySettings.repositoryId, set: next });
      await invalidateRepositoryCache(resolved.repo.id);
      res.json({ repositoryId: resolved.repo.id, ...next });
    } catch (error) {
      handleRequestError(res, error, 'Settings update error:');
    }
  });

  app.get('/api/repos/:username/:repoName/wiki', optionalAuthenticate, async (req, res) => {
    try {
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await requireRepositoryReadAccess(resolved.repo, (req as any).userId, res))) return;
      const pages = await cacheRepositoryRead(resolved.repo.id, 'wiki:list', async () => (
        await db.select().from(wikiPages)
          .where(eq(wikiPages.repositoryId, resolved.repo.id))
          .orderBy(desc(wikiPages.updatedAt))
      ));
      res.json(pages);
    } catch (error) {
      console.error('Wiki fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/wiki', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const title = readString(req.body.title, { field: 'title', maxLength: INPUT_LIMITS.title, allowEmpty: false });
      const content = readString(req.body.content, { field: 'content', maxLength: INPUT_LIMITS.markdown, allowEmpty: false, trim: false });
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });
      const slug = String(title).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || crypto.randomUUID();
      const now = new Date();
      const id = crypto.randomUUID();
      await db.insert(wikiPages).values({ id, repositoryId: resolved.repo.id, slug, title, content, authorId: userId, createdAt: now, updatedAt: now });
      await invalidateRepositoryCache(resolved.repo.id);
      res.json({ id, repositoryId: resolved.repo.id, slug, title, content, authorId: userId, createdAt: now, updatedAt: now });
    } catch (error) {
      handleRequestError(res, error, 'Wiki creation error:');
    }
  });

  app.get('/api/repos/:username/:repoName/wiki/:slug', optionalAuthenticate, async (req, res) => {
    try {
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await requireRepositoryReadAccess(resolved.repo, (req as any).userId, res))) return;
      const page = await cacheRepositoryRead(resolved.repo.id, `wiki:${req.params.slug}`, async () => {
        const currentPage = await db.select().from(wikiPages)
          .where(and(eq(wikiPages.repositoryId, resolved.repo.id), eq(wikiPages.slug, req.params.slug)))
          .limit(1);
        return currentPage[0] || null;
      });
      if (!page) return res.status(404).json({ error: 'Wiki page not found' });
      res.json(page);
    } catch (error) {
      console.error('Wiki page fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/repos/:username/:repoName/wiki/:slug', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const title = req.body.title === undefined ? undefined : readString(req.body.title, { field: 'title', maxLength: INPUT_LIMITS.title, allowEmpty: false });
      const content = req.body.content === undefined ? undefined : readString(req.body.content, { field: 'content', maxLength: INPUT_LIMITS.markdown, allowEmpty: false, trim: false });
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });
      const page = await db.select().from(wikiPages)
        .where(and(eq(wikiPages.repositoryId, resolved.repo.id), eq(wikiPages.slug, req.params.slug)))
        .limit(1);
      if (page.length === 0) return res.status(404).json({ error: 'Wiki page not found' });
      const nextTitle = title ?? page[0].title;
      const nextContent = content ?? page[0].content;
      const nextSlug = nextTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || page[0].slug;
      await db.update(wikiPages)
        .set({ title: nextTitle, content: nextContent, slug: nextSlug, updatedAt: new Date() })
        .where(eq(wikiPages.id, page[0].id));
      await invalidateRepositoryCache(resolved.repo.id);
      res.json({ ...page[0], title: nextTitle, content: nextContent, slug: nextSlug, updatedAt: new Date() });
    } catch (error) {
      handleRequestError(res, error, 'Wiki page update error:');
    }
  });

  app.delete('/api/repos/:username/:repoName/wiki/:slug', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });
      const page = await db.select().from(wikiPages)
        .where(and(eq(wikiPages.repositoryId, resolved.repo.id), eq(wikiPages.slug, req.params.slug)))
        .limit(1);
      if (page.length === 0) return res.status(404).json({ error: 'Wiki page not found' });
      await db.delete(wikiPages).where(eq(wikiPages.id, page[0].id));
      await invalidateRepositoryCache(resolved.repo.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Wiki page delete error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Repository Routes ---
  app.post('/api/repos', authenticate, async (req, res) => {
    try {
      const name = readRepoName(req.body.name);
      const description = readOptionalString(req.body.description, { field: 'description', maxLength: INPUT_LIMITS.repoDescription }) || '';
      const isPrivate = readBoolean(req.body.isPrivate);
      const userId = (req as any).userId;

      // Check if user already has a repo with this name
      const existingRepo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, userId), eq(repositories.name, name))).limit(1);
        
      if (existingRepo.length > 0) {
        return res.status(400).json({ error: 'repository with this name already exists' });
      }

      const repoId = crypto.randomUUID();
      const now = new Date();

      await db.insert(repositories).values({
        id: repoId,
        name,
        description: description || '',
        isPrivate: isPrivate || false,
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
      });

      // Handle optional initialization files
      const addReadme = readBoolean(req.body.addReadme);
      const nvignoreContent = readOptionalString(req.body.nvignoreContent, { field: '.nvignore content', maxLength: INPUT_LIMITS.readmeContent, trim: false });
      const licenseContent = readOptionalString(req.body.licenseContent, { field: 'license content', maxLength: INPUT_LIMITS.readmeContent, trim: false });
      const licenseKey = readOptionalString(req.body.licenseKey, { field: 'license key', maxLength: 40 });
      const filesToCreate = [];

      if (addReadme === true) {
        filesToCreate.push({
          path: 'README.md',
          content: `# ${name}\n\n${description || 'a new repository.'}`
        });
      }

      if (nvignoreContent) {
        filesToCreate.push({
          path: '.nvignore',
          content: nvignoreContent
        });
      }

      let finalLicenseContent = licenseContent;
      
      // Backend fallback for licenses if frontend fetch failed but key was provided
      if (!finalLicenseContent && licenseKey) {
        const templates: Record<string, string> = {
          'mit': `MIT License\n\nCopyright (c) ${now.getFullYear()} ${name}\n\nPermission is hereby granted...`,
          'apache-2.0': `Apache License 2.0...`,
          'gpl-3.0': `GNU GPL v3.0...`
        };
        if (templates[licenseKey]) {
          finalLicenseContent = templates[licenseKey];
        }
      }

      if (finalLicenseContent) {
        filesToCreate.push({
          path: 'LICENSE',
          content: finalLicenseContent
        });
      }

      if (filesToCreate.length > 0) {
        const commitId = crypto.randomUUID();
        await db.insert(commits).values({
          id: commitId,
          repositoryId: repoId,
          message: 'initial commit',
          authorId: userId,
          timestamp: now,
        });

        for (const file of filesToCreate) {
          const fileId = crypto.randomUUID();
          await db.insert(files).values({
            id: fileId,
            repositoryId: repoId,
            path: file.path,
            content: file.content,
            lastCommitId: commitId,
          });

          // Save snapshot
          try {
            await db.insert(fileVersions).values({
              id: crypto.randomUUID(),
              fileId,
              commitId,
              path: file.path,
              content: file.content,
              timestamp: now
            });
          } catch (e) {
            console.error('Snapshot failed (Initial):', e);
          }
        }
      }

      res.json({ success: true, repoId });
    } catch (error) {
      handleRequestError(res, error, 'Repository creation error:');
    }
  });

  app.post('/api/repos/:username/:repoName/fork', authenticate, async (req, res) => {
    try {
      const newName = readRepoName(req.body.newName, 'new repository name');
      const newDescription = readOptionalString(req.body.description, { field: 'description', maxLength: INPUT_LIMITS.repoDescription });
      const userId = (req as any).userId;

      // Find source user
      const sourceUser = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (sourceUser.length === 0) return res.status(404).json({ error: 'Source user not found' });

      // Find source repo
      const sourceRepo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, sourceUser[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (sourceRepo.length === 0) return res.status(404).json({ error: 'Source repository not found' });
      if (!(await canReadRepository(sourceRepo[0], userId))) return res.status(403).json({ error: 'Repository access denied' });

      // Find target user (current user)
      const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (currentUser.length === 0) return res.status(404).json({ error: 'Current user record not found' });

      // Check if user already has a repo with the new name
      const existingRepo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, userId), eq(repositories.name, newName))).limit(1);
      if (existingRepo.length > 0) return res.status(400).json({ error: 'You already have a repository with this name' });

      const forkId = crypto.randomUUID();
      const now = new Date();

      // Insert new repo
      await db.insert(repositories).values({
        id: forkId,
        name: newName,
        description: newDescription || sourceRepo[0].description,
        isPrivate: sourceRepo[0].isPrivate,
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
        language: sourceRepo[0].language,
      });

      // Clone files
      const sourceFiles = await db.select().from(files).where(eq(files.repositoryId, sourceRepo[0].id));
      
      if (sourceFiles.length > 0) {
        // Create initial fork commit
        const commitId = crypto.randomUUID();
        await db.insert(commits).values({
          id: commitId,
          repositoryId: forkId,
          message: `Forked from ${req.params.username}/${req.params.repoName}`,
          authorId: userId,
          timestamp: now,
        });

        for (const file of sourceFiles) {
          const fileId = crypto.randomUUID();
          await db.insert(files).values({
            id: fileId,
            repositoryId: forkId,
            path: file.path,
            content: file.content,
            lastCommitId: commitId,
          });

          // Snapshot
          await db.insert(fileVersions).values({
            id: crypto.randomUUID(),
            fileId,
            commitId,
            path: file.path,
            content: file.content,
            timestamp: now
          });
        }
      }

      // Increment fork count on source repo
      await db.update(repositories)
        .set({ forkCount: (sourceRepo[0].forkCount || 0) + 1 })
        .where(eq(repositories.id, sourceRepo[0].id));

      res.json({ success: true, username: currentUser[0].username, newRepoName: newName });
    } catch (error) {
      handleRequestError(res, error, 'Fork error:');
    }
  });

  app.get('/api/repos/:username', optionalAuthenticate, async (req, res) => {
    try {
      const q = readSearchQuery(req.query.q);
      const limit = readInteger(req.query.limit, { field: 'limit', min: 1, max: 50, defaultValue: 10 });
      const offset = readInteger(req.query.offset, { field: 'offset', min: 0, max: 5000, defaultValue: 0 });
      const currentUserId = (req as any).userId;
      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const searchFilter = q ? and(eq(repositories.ownerId, user[0].id), ilike(repositories.name, `%${q}%`)) : eq(repositories.ownerId, user[0].id);
      const allRepos = await db.select().from(repositories)
        .where(searchFilter)
        .orderBy(desc(repositories.updatedAt));
      const visibleRepos = [];
      for (const repo of allRepos) {
        if (await canReadRepository(repo, currentUserId)) {
          visibleRepos.push(repo);
        }
      }
      const paginatedRepos = visibleRepos.slice(offset, offset + limit);
      const totalCount = visibleRepos.length;
      
      // Update languages if missing
      for (const repo of paginatedRepos) {
        if (!repo.language) {
          const repoFiles = await db.select().from(files).where(eq(files.repositoryId, repo.id));
          const lang = detectLanguage(repoFiles.map(f => f.path));
          if (lang) {
            await db.update(repositories).set({ language: lang }).where(eq(repositories.id, repo.id));
            repo.language = lang;
          }
        }
      }

      let finalRepos = paginatedRepos;
      if (currentUserId) {
        const userStars = await db.select().from(stars).where(eq(stars.userId, currentUserId));
        const starredRepoIds = new Set(userStars.map(s => s.repositoryId));
        finalRepos = paginatedRepos.map(r => ({
          ...r,
          isStarred: starredRepoIds.has(r.id)
        }));
      }
      
      res.json({ repos: finalRepos, totalCount });
    } catch (error) {
      console.error('Repos fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/repos/:username/:repoName', optionalAuthenticate, async (req, res) => {
    try {
      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
        
      if (repo.length === 0) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      if (!(await requireRepositoryReadAccess(repo[0], (req as any).userId, res))) return;

      const repoSummary = await cacheRepositoryRead(repo[0].id, 'summary', async () => {
        let repoData = repo[0];
        if (!repoData.language) {
          const repoFiles = await db.select().from(files).where(eq(files.repositoryId, repoData.id));
          const lang = detectLanguage(repoFiles.map(f => f.path));
          if (lang) {
            await db.update(repositories).set({ language: lang }).where(eq(repositories.id, repoData.id));
            repoData = { ...repoData, language: lang };
          }
        }

        return {
          ...repoData,
          owner: {
            username: user[0].username,
            avatarUrl: user[0].avatarUrl,
            displayName: user[0].displayName
          }
        };
      });

      let isStarred = false;
      const currentUserId = (req as any).userId;
      if (currentUserId) {
        const starCheck = await db.select().from(stars)
          .where(and(eq(stars.userId, currentUserId), eq(stars.repositoryId, repo[0].id)))
          .limit(1);
        isStarred = starCheck.length > 0;
      }

      res.json({ 
        ...repoSummary,
        isStarred,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/repos/:username/:repoName', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const description = req.body.description === undefined
        ? undefined
        : readOptionalString(req.body.description, { field: 'description', maxLength: INPUT_LIMITS.repoDescription });
      const websiteUrl = req.body.websiteUrl === undefined ? undefined : readSafeUrl(req.body.websiteUrl, 'website URL');
      const isPrivate = req.body.isPrivate === undefined ? undefined : readBoolean(req.body.isPrivate);
      
      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0) return res.status(404).json({ error: 'User not found' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });
      if (repo[0].ownerId !== userId) return res.status(403).json({ error: 'Unauthorized' });

      await db.update(repositories)
        .set({ 
          description: description !== undefined ? description : repo[0].description,
          websiteUrl: websiteUrl !== undefined ? websiteUrl : repo[0].websiteUrl,
          isPrivate: isPrivate !== undefined ? Boolean(isPrivate) : repo[0].isPrivate,
        })
        .where(eq(repositories.id, repo[0].id));

      const updatedRepo = await db.select().from(repositories)
        .where(eq(repositories.id, repo[0].id)).limit(1);

      await invalidateRepositoryCache(repo[0].id);
      res.json({ 
        ...updatedRepo[0],
        owner: {
          username: user[0].username,
          avatarUrl: user[0].avatarUrl,
          displayName: user[0].displayName
        }
      });
    } catch (error) {
      handleRequestError(res, error, 'Repository update error:');
    }
  });

  app.delete('/api/repos/:username/:repoName', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0) return res.status(404).json({ error: 'User not found' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });
      if (!(await canWriteRepository(repo[0], userId))) return res.status(403).json({ error: 'Unauthorized' });

      // Delete related data first
      await db.delete(files).where(eq(files.repositoryId, repo[0].id));
      await db.delete(commits).where(eq(commits.repositoryId, repo[0].id));
      await db.delete(issues).where(eq(issues.repositoryId, repo[0].id));
      await db.delete(repositories).where(eq(repositories.id, repo[0].id));

      await invalidateRepositoryCache(repo[0].id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/repos/:username/:repoName/commits', optionalAuthenticate, async (req, res) => {
    try {
      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0) return res.status(404).json({ error: 'User not found' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });
      if (!(await requireRepositoryReadAccess(repo[0], (req as any).userId, res))) return;

      const repoCommits = await cacheRepositoryRead(repo[0].id, 'commits', async () => (
        await db.select({
          id: commits.id,
          message: commits.message,
          timestamp: commits.timestamp,
          authorUsername: users.username,
          authorAvatarUrl: users.avatarUrl
        }).from(commits)
          .leftJoin(users, eq(commits.authorId, users.id))
          .where(eq(commits.repositoryId, repo[0].id))
          .orderBy(desc(commits.timestamp))
      ));

      res.json(repoCommits);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  app.get('/api/repos/:username/:repoName/commits/:commitId/files', optionalAuthenticate, async (req, res) => {
    try {
      const { commitId } = req.params;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await requireRepositoryReadAccess(resolved.repo, (req as any).userId, res))) return;
      const commit = await db.select().from(commits)
        .where(and(eq(commits.id, commitId), eq(commits.repositoryId, resolved.repo.id)))
        .limit(1);
      if (commit.length === 0) return res.status(404).json({ error: 'Commit not found' });
      const changedFiles = await db.select({
        id: fileVersions.id,
        path: fileVersions.path,
        content: fileVersions.content,
        fileId: fileVersions.fileId,
        timestamp: fileVersions.timestamp
      })
      .from(fileVersions)
      .where(eq(fileVersions.commitId, commitId));

      let finalFiles = [];

      if (changedFiles.length > 0) {
        finalFiles = await Promise.all(changedFiles.map(async (file) => {
          const prev = await db.select({ content: fileVersions.content })
            .from(fileVersions)
            .where(and(
              eq(fileVersions.fileId, file.fileId),
              sql`${fileVersions.timestamp} < ${file.timestamp}`
            ))
            .orderBy(desc(fileVersions.timestamp))
            .limit(1);
          return { ...file, previousContent: prev[0]?.content || null };
        }));
      } else {
        // Fallback for legacy commits: check the main files table
        const legacyFiles = await db.select({
          id: files.id,
          path: files.path,
          content: files.content,
          fileId: files.id,
          timestamp: sql<string>`null`
        })
        .from(files)
        .where(eq(files.lastCommitId, commitId));
        
        finalFiles = legacyFiles.map(f => ({ ...f, previousContent: null }));
      }
      
      res.json(finalFiles);
    } catch (error) {
      console.error('Commit files error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Tags Routes ---
  app.get('/api/repos/:username/:repoName/tags', optionalAuthenticate, async (req, res) => {
    try {
      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0) return res.status(404).json({ error: 'User not found' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });
      if (!(await requireRepositoryReadAccess(repo[0], (req as any).userId, res))) return;

      const repoTags = await cacheRepositoryRead(repo[0].id, 'tags', async () => (
        await db.select({
          id: tags.id,
          name: tags.name,
          message: tags.message,
          createdAt: tags.createdAt,
          commitId: tags.commitId,
          creator: {
            username: users.username,
            avatarUrl: users.avatarUrl,
            displayName: users.displayName
          },
          commit: {
            message: commits.message,
            authorId: commits.authorId
          }
        })
        .from(tags)
        .leftJoin(users, eq(tags.creatorId, users.id))
        .leftJoin(commits, eq(tags.commitId, commits.id))
        .where(eq(tags.repositoryId, repo[0].id))
        .orderBy(desc(tags.createdAt))
      ));

      res.json(repoTags);
    } catch (error) {
      console.error('Tags fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/tags', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const name = readString(req.body.name, { field: 'tag name', maxLength: INPUT_LIMITS.tagName, allowEmpty: false, pattern: /^[A-Za-z0-9._-]+$/ });
      const commitId = readString(req.body.commitId, { field: 'commit ID', maxLength: 128, allowEmpty: false });
      const message = readOptionalString(req.body.message, { field: 'tag message', maxLength: INPUT_LIMITS.commitMessage });

      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });
      const defaultBranch = await getRepositoryDefaultBranch(resolved.repo.id);
      const commit = await db.select().from(commits)
        .where(and(eq(commits.id, commitId), eq(commits.repositoryId, resolved.repo.id)))
        .limit(1);
      if (commit.length === 0) return res.status(400).json({ error: 'Commit not found' });
      if (commit[0].branchName === defaultBranch && !(await enforceDirectWritePolicy(resolved.repo, defaultBranch, res))) return;

      const tagId = crypto.randomUUID();
      await db.insert(tags).values({
        id: tagId,
        repositoryId: resolved.repo.id,
        name,
        commitId,
        message: message || null,
        creatorId: userId,
      });

      const newTag = await db.select({
        id: tags.id,
        name: tags.name,
        message: tags.message,
        createdAt: tags.createdAt,
        commitId: tags.commitId,
        creator: {
          username: users.username,
          avatarUrl: users.avatarUrl,
          displayName: users.displayName
        }
      })
      .from(tags)
      .leftJoin(users, eq(tags.creatorId, users.id))
      .where(eq(tags.id, tagId))
      .limit(1);

      await invalidateRepositoryCache(resolved.repo.id);
      res.json(newTag[0]);
    } catch (error) {
      handleRequestError(res, error, 'Tag creation error:');
    }
  });

  app.delete('/api/repos/:username/:repoName/tags/:tagId', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;

      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });

      const tag = await db.select().from(tags)
        .where(and(eq(tags.id, req.params.tagId), eq(tags.repositoryId, resolved.repo.id))).limit(1);
      if (tag.length === 0) return res.status(404).json({ error: 'Tag not found' });
      const defaultBranch = await getRepositoryDefaultBranch(resolved.repo.id);
      const commit = await db.select().from(commits)
        .where(and(eq(commits.id, tag[0].commitId), eq(commits.repositoryId, resolved.repo.id)))
        .limit(1);
      if (commit.length > 0 && commit[0].branchName === defaultBranch && !(await enforceDirectWritePolicy(resolved.repo, defaultBranch, res))) return;

      await db.delete(tags).where(eq(tags.id, req.params.tagId));

      await invalidateRepositoryCache(resolved.repo.id);
      res.json({ message: 'Tag deleted' });
    } catch (error) {
      console.error('Tag deletion error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Releases Routes ---
  app.get('/api/repos/:username/:repoName/releases', optionalAuthenticate, async (req, res) => {
    try {
      await releaseBucketReady;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await requireRepositoryReadAccess(resolved.repo, (req as any).userId, res))) return;

      const releaseList = await cacheRepositoryRead(resolved.repo.id, 'releases', async () => {
        const repoReleases = await db.select({
          id: releases.id,
          tagId: releases.tagId,
          tagName: releases.tagName,
          title: releases.title,
          body: releases.body,
          isDraft: releases.isDraft,
          isPrerelease: releases.isPrerelease,
          createdAt: releases.createdAt,
          updatedAt: releases.updatedAt,
          publishedAt: releases.publishedAt,
          author: {
            username: users.username,
            avatarUrl: users.avatarUrl,
            displayName: users.displayName
          }
        })
        .from(releases)
        .leftJoin(users, eq(releases.authorId, users.id))
        .where(eq(releases.repositoryId, resolved.repo.id))
        .orderBy(desc(releases.createdAt));

        const releaseIds = repoReleases.map(release => release.id);
        const assets = releaseIds.length > 0
          ? await db.select().from(releaseAssets).where(inArray(releaseAssets.releaseId, releaseIds))
          : [];

        return repoReleases.map(release => ({
          ...release,
          assets: assets
            .filter(asset => asset.releaseId === release.id)
            .map(asset => ({
              id: asset.id,
              name: asset.name,
              size: asset.size,
              contentType: asset.contentType,
              createdAt: asset.createdAt,
              downloadUrl: `/api/repos/${req.params.username}/${req.params.repoName}/releases/assets/${asset.id}/download`
            }))
        }));
      });

      res.json(releaseList);
    } catch (error) {
      console.error('Releases fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/releases', authenticate, async (req, res) => {
    try {
      await releaseBucketReady;
      const userId = (req as any).userId;
      const tagName = readString(req.body.tagName, { field: 'tag name', maxLength: INPUT_LIMITS.tagName, allowEmpty: false, pattern: /^[A-Za-z0-9._-]+$/ });
      const targetCommitId = req.body.targetCommitId === undefined ? null : readString(req.body.targetCommitId, { field: 'target commit ID', maxLength: 128, allowEmpty: false });
      const title = readString(req.body.title, { field: 'title', maxLength: INPUT_LIMITS.title, allowEmpty: false });
      const body = readOptionalString(req.body.body, { field: 'release notes', maxLength: INPUT_LIMITS.markdown, trim: false });
      const isDraft = readBoolean(req.body.isDraft);
      const isPrerelease = readBoolean(req.body.isPrerelease);
      const assets = Array.isArray(req.body.assets) ? req.body.assets : [];
      if (assets.length > INPUT_LIMITS.releaseAssetCount) {
        return res.status(400).json({ error: 'Too many assets' });
      }

      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });
      const defaultBranch = await getRepositoryDefaultBranch(resolved.repo.id);

      let tag = await db.select().from(tags)
        .where(and(eq(tags.repositoryId, resolved.repo.id), eq(tags.name, tagName)))
        .limit(1);

      if (tag.length === 0) {
        const commitId = targetCommitId || (await db.select().from(commits)
          .where(eq(commits.repositoryId, resolved.repo.id))
          .orderBy(desc(commits.timestamp))
          .limit(1))[0]?.id;

        if (!commitId) {
          return res.status(400).json({ error: 'A target commit is required when creating the first tag' });
        }

        const commit = await db.select().from(commits)
          .where(and(eq(commits.repositoryId, resolved.repo.id), eq(commits.id, commitId)))
          .limit(1);
        if (commit.length === 0) return res.status(400).json({ error: 'Target commit not found' });
        if (commit[0].branchName === defaultBranch && !(await enforceDirectWritePolicy(resolved.repo, defaultBranch, res))) return;

        const tagId = crypto.randomUUID();
        await db.insert(tags).values({
          id: tagId,
          repositoryId: resolved.repo.id,
          name: tagName,
          commitId,
          message: body || null,
          creatorId: userId,
        });
        tag = await db.select().from(tags).where(eq(tags.id, tagId)).limit(1);
      }

      const existingRelease = await db.select().from(releases)
        .where(and(eq(releases.repositoryId, resolved.repo.id), eq(releases.tagName, tagName)))
        .limit(1);
      if (existingRelease.length > 0) {
        return res.status(400).json({ error: 'A release for this tag already exists' });
      }

      const releaseId = crypto.randomUUID();
      const now = new Date();
      const uploadedAssets = [];
      const uploadedStoragePaths: string[] = [];
      const requestAssets = Array.isArray(req.body.assets) ? (req.body.assets as any[]) : [];
      for (const asset of requestAssets) {
        if (!asset?.name || !asset?.dataBase64) continue;
        const assetName = readString(asset.name, { field: 'asset name', maxLength: INPUT_LIMITS.releaseAssetName, allowEmpty: false });
        const assetBase64 = readString(asset.dataBase64, { field: 'asset data', maxLength: 5_000_000, allowEmpty: false, trim: false });
        const assetContentType = readOptionalString(asset.contentType, { field: 'asset content type', maxLength: 120 }) || 'application/octet-stream';
        const assetId = crypto.randomUUID();
        const safeName = assetName.replace(/[\\/:*?"<>|]/g, '_');
        const storagePath = `${resolved.repo.id}/${releaseId}/${assetId}-${safeName}`;
        const buffer = Buffer.from(assetBase64, 'base64');

        const { error: uploadError } = await supabaseAdmin.storage
          .from(releaseBucket)
          .upload(storagePath, buffer, {
            contentType: assetContentType,
            upsert: false,
          });
        if (uploadError) throw uploadError;
        uploadedStoragePaths.push(storagePath);

        uploadedAssets.push({
          id: assetId,
          name: assetName,
          size: Number(asset.size || buffer.length),
          contentType: assetContentType,
          storagePath,
          downloadUrl: `/api/repos/${req.params.username}/${req.params.repoName}/releases/assets/${assetId}/download`
        });
      }

      try {
        await db.transaction(async (tx) => {
          await tx.insert(releases).values({
            id: releaseId,
            repositoryId: resolved.repo.id,
            tagId: tag[0].id,
            tagName,
            title,
            body: body || null,
            authorId: userId,
            isDraft: Boolean(isDraft),
            isPrerelease: Boolean(isPrerelease),
            createdAt: now,
            updatedAt: now,
            publishedAt: isDraft ? null : now,
          });

          if (uploadedAssets.length > 0) {
            await tx.insert(releaseAssets).values(uploadedAssets.map((asset: any) => ({
              id: asset.id,
              releaseId,
              name: asset.name,
              size: asset.size,
              contentType: asset.contentType,
              storagePath: asset.storagePath,
            })));
          }
        });
      } catch (error) {
        if (uploadedStoragePaths.length > 0) {
          await supabaseAdmin.storage.from(releaseBucket).remove(uploadedStoragePaths);
        }
        throw error;
      }

      await invalidateRepositoryCache(resolved.repo.id);
      res.json({
        id: releaseId,
        tagId: tag[0].id,
        tagName,
        title,
        body: body || null,
        isDraft: Boolean(isDraft),
        isPrerelease: Boolean(isPrerelease),
        createdAt: now,
        updatedAt: now,
        publishedAt: isDraft ? null : now,
        author: { username: resolved.owner.username, avatarUrl: resolved.owner.avatarUrl, displayName: resolved.owner.displayName },
        assets: uploadedAssets,
      });
    } catch (error) {
      handleRequestError(res, error, 'Release creation error:');
    }
  });

  app.patch('/api/repos/:username/:repoName/releases/:releaseId', authenticate, async (req, res) => {
    try {
      await releaseBucketReady;
      const userId = (req as any).userId;
      const title = req.body.title === undefined ? undefined : readString(req.body.title, { field: 'title', maxLength: INPUT_LIMITS.title, allowEmpty: false });
      const body = req.body.body === undefined ? undefined : readOptionalString(req.body.body, { field: 'release notes', maxLength: INPUT_LIMITS.markdown, trim: false });
      const isDraft = req.body.isDraft === undefined ? undefined : readBoolean(req.body.isDraft);
      const isPrerelease = req.body.isPrerelease === undefined ? undefined : readBoolean(req.body.isPrerelease);

      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });

      const existing = await db.select().from(releases)
        .where(and(eq(releases.repositoryId, resolved.repo.id), eq(releases.id, req.params.releaseId)))
        .limit(1);
      if (existing.length === 0) return res.status(404).json({ error: 'Release not found' });

      const now = new Date();
      const nextIsDraft = isDraft === undefined ? Boolean(existing[0].isDraft) : Boolean(isDraft);
      await db.update(releases).set({
        title: title ?? existing[0].title,
        body: body ?? existing[0].body,
        isDraft: nextIsDraft,
        isPrerelease: isPrerelease === undefined ? existing[0].isPrerelease : Boolean(isPrerelease),
        updatedAt: now,
        publishedAt: (existing[0].publishedAt || nextIsDraft) ? existing[0].publishedAt : now,
      }).where(eq(releases.id, req.params.releaseId));

      await invalidateRepositoryCache(resolved.repo.id);
      res.json({ success: true });
    } catch (error) {
      handleRequestError(res, error, 'Release update error:');
    }
  });

  app.delete('/api/repos/:username/:repoName/releases/:releaseId', authenticate, async (req, res) => {
    try {
      await releaseBucketReady;
      const userId = (req as any).userId;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });

      const existing = await db.select().from(releases)
        .where(and(eq(releases.repositoryId, resolved.repo.id), eq(releases.id, req.params.releaseId)))
        .limit(1);
      if (existing.length === 0) return res.status(404).json({ error: 'Release not found' });

      const assets = await db.select().from(releaseAssets).where(eq(releaseAssets.releaseId, req.params.releaseId));
      if (assets.length > 0) {
        await supabaseAdmin.storage.from(releaseBucket).remove(assets.map(asset => asset.storagePath));
      }
      await db.delete(releaseAssets).where(eq(releaseAssets.releaseId, req.params.releaseId));
      await db.delete(releases).where(eq(releases.id, req.params.releaseId));

      await invalidateRepositoryCache(resolved.repo.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Release deletion error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/releases/:releaseId/assets', authenticate, async (req, res) => {
    try {
      await releaseBucketReady;
      const userId = (req as any).userId;
      if (req.body.assets !== undefined && (!Array.isArray(req.body.assets) || req.body.assets.length > INPUT_LIMITS.releaseAssetCount)) {
        return res.status(400).json({ error: 'Too many assets' });
      }

      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });

      const release = await db.select().from(releases)
        .where(and(eq(releases.repositoryId, resolved.repo.id), eq(releases.id, req.params.releaseId)))
        .limit(1);
      if (release.length === 0) return res.status(404).json({ error: 'Release not found' });

      const uploadedAssets = [];
      const requestAssets = Array.isArray(req.body.assets) ? (req.body.assets as any[]) : [];
      for (const asset of requestAssets) {
        if (!asset?.name || !asset?.dataBase64) continue;
        const assetName = readString(asset.name, { field: 'asset name', maxLength: INPUT_LIMITS.releaseAssetName, allowEmpty: false });
        const assetBase64 = readString(asset.dataBase64, { field: 'asset data', maxLength: 5_000_000, allowEmpty: false, trim: false });
        const assetContentType = readOptionalString(asset.contentType, { field: 'asset content type', maxLength: 120 }) || 'application/octet-stream';
        const assetId = crypto.randomUUID();
        const safeName = assetName.replace(/[\\/:*?"<>|]/g, '_');
        const storagePath = `${resolved.repo.id}/${req.params.releaseId}/${assetId}-${safeName}`;
        const buffer = Buffer.from(assetBase64, 'base64');

        const { error: uploadError } = await supabaseAdmin.storage
          .from(releaseBucket)
          .upload(storagePath, buffer, {
            contentType: assetContentType,
            upsert: false,
          });
        if (uploadError) throw uploadError;

        await db.insert(releaseAssets).values({
          id: assetId,
          releaseId: req.params.releaseId,
          name: assetName,
          size: Number(asset.size || buffer.length),
          contentType: assetContentType,
          storagePath,
        });

        uploadedAssets.push({
          id: assetId,
          name: assetName,
          size: Number(asset.size || buffer.length),
          contentType: assetContentType,
          downloadUrl: `/api/repos/${req.params.username}/${req.params.repoName}/releases/assets/${assetId}/download`
        });
      }

      await db.update(releases).set({ updatedAt: new Date() }).where(eq(releases.id, req.params.releaseId));
      await invalidateRepositoryCache(resolved.repo.id);
      res.json(uploadedAssets);
    } catch (error) {
      handleRequestError(res, error, 'Release asset upload error:');
    }
  });

  app.delete('/api/repos/:username/:repoName/releases/assets/:assetId', authenticate, async (req, res) => {
    try {
      await releaseBucketReady;
      const userId = (req as any).userId;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });

      const asset = await db.select({
        id: releaseAssets.id,
        releaseId: releaseAssets.releaseId,
        storagePath: releaseAssets.storagePath,
        repositoryId: releases.repositoryId,
      })
      .from(releaseAssets)
      .innerJoin(releases, eq(releaseAssets.releaseId, releases.id))
      .where(eq(releaseAssets.id, req.params.assetId))
      .limit(1);

      if (asset.length === 0 || asset[0].repositoryId !== resolved.repo.id) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      await supabaseAdmin.storage.from(releaseBucket).remove([asset[0].storagePath]);
      await db.delete(releaseAssets).where(eq(releaseAssets.id, req.params.assetId));
      await db.update(releases).set({ updatedAt: new Date() }).where(eq(releases.id, asset[0].releaseId));

      await invalidateRepositoryCache(resolved.repo.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Release asset deletion error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/repos/:username/:repoName/releases/assets/:assetId/download', optionalAuthenticate, async (req, res) => {
    try {
      await releaseBucketReady;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await requireRepositoryReadAccess(resolved.repo, (req as any).userId, res))) return;

      const asset = await db.select({
        name: releaseAssets.name,
        storagePath: releaseAssets.storagePath,
        repositoryId: releases.repositoryId,
      })
      .from(releaseAssets)
      .innerJoin(releases, eq(releaseAssets.releaseId, releases.id))
      .where(eq(releaseAssets.id, req.params.assetId))
      .limit(1);

      if (asset.length === 0 || asset[0].repositoryId !== resolved.repo.id) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      const { data, error } = await supabaseAdmin.storage
        .from(releaseBucket)
        .createSignedUrl(asset[0].storagePath, 60, { download: asset[0].name });
      if (error || !data?.signedUrl) throw error || new Error('Failed to sign release asset URL');

      res.redirect(data.signedUrl);
    } catch (error) {
      console.error('Release asset download error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Pull Request Routes ---
  const buildBranchComparison = async (repoId: string, ownerId: string, sourceBranch: string, targetBranch: string) => {
    const sourceFiles = await getFilesForBranch(repoId, ownerId, sourceBranch);
    const targetFiles = await getFilesForBranch(repoId, ownerId, targetBranch);
    if (!sourceFiles || !targetFiles) return null;

    const targetMap = new Map(targetFiles.map(file => [file.path, file]));
    const sourceMap = new Map(sourceFiles.map(file => [file.path, file]));
    const paths = Array.from(new Set([...sourceMap.keys(), ...targetMap.keys()])).sort();

    const changedFiles = paths
      .map(path => {
        const source = sourceMap.get(path);
        const target = targetMap.get(path);
        if ((source?.content || '') === (target?.content || '')) return null;
        return {
          path,
          status: source && target ? 'modified' : source ? 'added' : 'deleted',
          sourceContent: source?.content || '',
          targetContent: target?.content || '',
        };
      })
      .filter(Boolean);

    const sourceBranchRecord = await getBranch(repoId, ownerId, sourceBranch);
    const sourceSnapshot = sourceBranchRecord
      ? await db.select().from(branchFiles).where(eq(branchFiles.branchId, sourceBranchRecord.id))
      : [];
    const conflicts = changedFiles.filter((change: any) => {
      const snapshot = sourceSnapshot.find(file => file.path === change.path);
      if (!snapshot) return false;
      const target = targetMap.get(change.path);
      return snapshot.baseContent !== null &&
        snapshot.baseContent !== (target?.content || '') &&
        snapshot.content !== (target?.content || '');
    });

    return {
      changedFiles,
      conflicts,
      canMerge: conflicts.length === 0,
    };
  };

  app.get('/api/repos/:username/:repoName/pulls', optionalAuthenticate, async (req, res) => {
    try {
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await requireRepositoryReadAccess(resolved.repo, (req as any).userId, res))) return;
      const pulls = await db.select({
        id: pullRequests.id,
        title: pullRequests.title,
        description: pullRequests.description,
        sourceBranch: pullRequests.sourceBranch,
        targetBranch: pullRequests.targetBranch,
        status: pullRequests.status,
        createdAt: pullRequests.createdAt,
        updatedAt: pullRequests.updatedAt,
        mergedAt: pullRequests.mergedAt,
        creatorUsername: users.username,
      })
      .from(pullRequests)
      .leftJoin(users, eq(pullRequests.creatorId, users.id))
      .where(eq(pullRequests.repositoryId, resolved.repo.id))
      .orderBy(desc(pullRequests.createdAt));
      res.json(pulls);
    } catch (error) {
      console.error('Pull requests fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/pulls', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      const defaultBranch = await getRepositoryDefaultBranch(resolved.repo.id);
      const title = readString(req.body.title, { field: 'title', maxLength: INPUT_LIMITS.title, allowEmpty: false });
      const description = readOptionalString(req.body.description, { field: 'description', maxLength: INPUT_LIMITS.longDescription });
      const sourceBranch = readBranchName(req.body.sourceBranch, 'source branch');
      const targetBranch = req.body.targetBranch === undefined ? defaultBranch : readBranchName(req.body.targetBranch, 'target branch');

      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });
      if (sourceBranch === targetBranch) return res.status(400).json({ error: 'Choose different branches to compare' });

      const comparison = await buildBranchComparison(resolved.repo.id, resolved.owner.id, sourceBranch, targetBranch);
      if (!comparison) return res.status(404).json({ error: 'Branch not found' });
      if (comparison.changedFiles.length === 0) return res.status(400).json({ error: 'There are no changes to compare' });

      const id = crypto.randomUUID();
      const now = new Date();
      await db.insert(pullRequests).values({
        id,
        repositoryId: resolved.repo.id,
        title,
        description: description || null,
        sourceBranch,
        targetBranch,
        creatorId: userId,
        status: 'open',
        createdAt: now,
        updatedAt: now,
      });
      res.json({ id, title, description, sourceBranch, targetBranch, status: 'open', createdAt: now, updatedAt: now });
    } catch (error) {
      handleRequestError(res, error, 'Pull request creation error:');
    }
  });

  app.get('/api/repos/:username/:repoName/pulls/:pullId/compare', optionalAuthenticate, async (req, res) => {
    try {
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await requireRepositoryReadAccess(resolved.repo, (req as any).userId, res))) return;
      const pr = await db.select().from(pullRequests).where(eq(pullRequests.id, req.params.pullId)).limit(1);
      if (pr.length === 0 || pr[0].repositoryId !== resolved.repo.id) return res.status(404).json({ error: 'Pull request not found' });
      const comparison = await buildBranchComparison(resolved.repo.id, resolved.owner.id, pr[0].sourceBranch, pr[0].targetBranch);
      if (!comparison) return res.status(404).json({ error: 'Branch not found' });
      res.json(comparison);
    } catch (error) {
      console.error('Pull request compare error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/repos/:username/:repoName/pulls/:pullId/reviews', optionalAuthenticate, async (req, res) => {
    try {
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await requireRepositoryReadAccess(resolved.repo, (req as any).userId, res))) return;
      const pr = await db.select().from(pullRequests).where(eq(pullRequests.id, req.params.pullId)).limit(1);
      if (pr.length === 0 || pr[0].repositoryId !== resolved.repo.id) return res.status(404).json({ error: 'Pull request not found' });
      const reviews = await db.select({
        id: pullRequestReviews.id,
        status: pullRequestReviews.status,
        comment: pullRequestReviews.comment,
        createdAt: pullRequestReviews.createdAt,
        reviewerUsername: users.username,
      })
      .from(pullRequestReviews)
      .leftJoin(users, eq(pullRequestReviews.reviewerId, users.id))
      .where(eq(pullRequestReviews.pullRequestId, req.params.pullId))
      .orderBy(desc(pullRequestReviews.createdAt));
      res.json(reviews);
    } catch (error) {
      console.error('Pull request reviews fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/pulls/:pullId/reviews', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });
      const pr = await db.select().from(pullRequests).where(eq(pullRequests.id, req.params.pullId)).limit(1);
      if (pr.length === 0 || pr[0].repositoryId !== resolved.repo.id) return res.status(404).json({ error: 'Pull request not found' });
      if (pr[0].status !== 'open') return res.status(400).json({ error: 'Pull request is not open' });
      if (!canReviewPullRequest(userId, pr[0].creatorId)) return res.status(409).json({ error: 'Pull request authors cannot review their own pull request' });
      const existing = await db.select().from(pullRequestReviews)
        .where(and(eq(pullRequestReviews.pullRequestId, req.params.pullId), eq(pullRequestReviews.reviewerId, userId)))
        .limit(1);
      if (existing.length > 0) await db.delete(pullRequestReviews).where(eq(pullRequestReviews.id, existing[0].id));
      const id = crypto.randomUUID();
      const now = new Date();
      const nextStatus = ['approved', 'changes_requested', 'commented'].includes(req.body.status) ? req.body.status : 'approved';
      const comment = readOptionalString(req.body.comment, { field: 'review comment', maxLength: INPUT_LIMITS.issueComment });
      await db.insert(pullRequestReviews).values({
        id,
        pullRequestId: req.params.pullId,
        reviewerId: userId,
        status: nextStatus,
        comment,
        createdAt: now,
      });
      res.json({ id, status: nextStatus, comment, createdAt: now });
    } catch (error) {
      handleRequestError(res, error, 'Pull request review creation error:');
    }
  });

  app.post('/api/repos/:username/:repoName/pulls/:pullId/merge', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });

      const pr = await db.select().from(pullRequests).where(eq(pullRequests.id, req.params.pullId)).limit(1);
      if (pr.length === 0 || pr[0].repositoryId !== resolved.repo.id) return res.status(404).json({ error: 'Pull request not found' });
      if (pr[0].status !== 'open') return res.status(400).json({ error: 'Pull request is not open' });
      const settings = await db.select().from(repositorySettings)
        .where(eq(repositorySettings.repositoryId, resolved.repo.id)).limit(1);
      const requiredReviews = settings[0]?.requiredReviewCount || 0;
      if (requiredReviews > 0) {
        const reviews = await db.select().from(pullRequestReviews)
          .where(eq(pullRequestReviews.pullRequestId, req.params.pullId));
        const approvalCount = countApprovedReviews(reviews as any[], pr[0].creatorId);
        if (approvalCount < requiredReviews) {
          return res.status(409).json({ error: `Branch protection requires ${requiredReviews} review(s) before merging`, approvals: approvalCount, requiredReviews });
        }
      }
      const comparison = await buildBranchComparison(resolved.repo.id, resolved.owner.id, pr[0].sourceBranch, pr[0].targetBranch);
      if (!comparison) return res.status(404).json({ error: 'Branch not found' });
      if (!comparison.canMerge) return res.status(409).json({ error: 'Merge conflicts detected', conflicts: comparison.conflicts });

      const now = new Date();
      const mergeCommitId = crypto.randomUUID();
      const defaultBranch = await getRepositoryDefaultBranch(resolved.repo.id);
      await db.transaction(async (tx) => {
        await tx.insert(commits).values({
          id: mergeCommitId,
          repositoryId: resolved.repo.id,
          message: `Merge pull request: ${pr[0].title}`,
          authorId: userId,
          branchName: pr[0].targetBranch,
          timestamp: now,
        });

        for (const change of comparison.changedFiles as any[]) {
          if (pr[0].targetBranch !== defaultBranch) continue;
          if (change.status === 'deleted') {
            await tx.delete(files).where(and(eq(files.repositoryId, resolved.repo.id), eq(files.path, change.path)));
            continue;
          }
          const existing = await tx.select().from(files)
            .where(and(eq(files.repositoryId, resolved.repo.id), eq(files.path, change.path))).limit(1);
          if (existing.length > 0) {
            await tx.update(files).set({ content: change.sourceContent, lastCommitId: mergeCommitId }).where(eq(files.id, existing[0].id));
          } else {
            await tx.insert(files).values({
              id: crypto.randomUUID(),
              repositoryId: resolved.repo.id,
              path: change.path,
              content: change.sourceContent,
              lastCommitId: mergeCommitId,
            });
          }
        }

        await tx.update(pullRequests)
          .set({ status: 'merged', mergeCommitId, updatedAt: now, mergedAt: now })
          .where(eq(pullRequests.id, req.params.pullId));
      });
      await invalidateRepositoryCache(resolved.repo.id);
      res.json({ success: true, mergeCommitId });
    } catch (error) {
      console.error('Pull request merge error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Files Routes ---
  app.get('/api/repos/:username/:repoName/files', optionalAuthenticate, async (req, res) => {
    try {
      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0) return res.status(404).json({ error: 'User not found' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });
      if (!(await requireRepositoryReadAccess(repo[0], (req as any).userId, res))) return;

      const limit = readInteger(req.query.limit, { field: 'limit', min: 1, max: 200, defaultValue: 100 });
      const offset = readInteger(req.query.offset, { field: 'offset', min: 0, max: 5000, defaultValue: 0 });
      const branchName = req.query.branch === undefined ? 'main' : readBranchName(req.query.branch, 'branch');

      const branchFilesResult = await getFilesForBranch(repo[0].id, user[0].id, branchName);
      if (!branchFilesResult) return res.status(404).json({ error: 'Branch not found' });
      const repoFiles = branchFilesResult.slice(offset, offset + limit);
      res.json(repoFiles);
    } catch (error) {
      handleRequestError(res, error, 'Files fetch error:');
    }
  });

  app.post('/api/repos/:username/:repoName/files', authenticate, async (req, res) => {
    try {
      const path = readRepoPath(req.body.path);
      const content = readString(req.body.content, { field: 'content', maxLength: INPUT_LIMITS.fileContent, allowEmpty: true, trim: false });
      const message = readOptionalString(req.body.message, { field: 'commit message', maxLength: INPUT_LIMITS.commitMessage });
      const branch = req.body.branch === undefined ? 'main' : readBranchName(req.body.branch, 'branch');
      const userId = (req as any).userId;

      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });
      if (!(await enforceDirectWritePolicy(resolved.repo, branch, res))) return;

      const now = new Date();
      const commitId = crypto.randomUUID();

      const defaultBranch = await getRepositoryDefaultBranch(resolved.repo.id);
      if (branch !== defaultBranch) {
        const targetBranch = await getBranch(resolved.repo.id, resolved.owner.id, branch);
        if (!targetBranch) return res.status(404).json({ error: 'Branch not found' });
        await db.transaction(async (tx) => {
          await tx.insert(commits).values({
            id: commitId,
            repositoryId: resolved.repo.id,
            message: message || `Update ${path}`,
            authorId: userId,
            branchName: branch,
            timestamp: now,
          });

          const existingBranchFile = await tx.select().from(branchFiles)
          .where(and(eq(branchFiles.branchId, targetBranch.id), eq(branchFiles.path, path))).limit(1);

          if (existingBranchFile.length > 0) {
            await tx.update(branchFiles)
              .set({ content, lastCommitId: commitId })
              .where(eq(branchFiles.id, existingBranchFile[0].id));
          } else {
            await tx.insert(branchFiles).values({
              id: crypto.randomUUID(),
              branchId: targetBranch.id,
              path,
              content,
              baseContent: null,
              lastCommitId: commitId,
            });
          }
        });
        await invalidateRepositoryCache(resolved.repo.id);
        return res.json({ success: true });
      }

      await db.transaction(async (tx) => {
        await tx.insert(commits).values({
          id: commitId,
          repositoryId: resolved.repo.id,
          message: message || `Update ${path}`,
          authorId: userId,
          branchName: branch,
          timestamp: now,
        });

        const existingFile = await tx.select().from(files)
          .where(and(eq(files.repositoryId, resolved.repo.id), eq(files.path, path))).limit(1);

        let fileId = existingFile[0]?.id || crypto.randomUUID();
        if (existingFile.length > 0) {
          await tx.update(files)
            .set({ content, lastCommitId: commitId })
            .where(eq(files.id, fileId));
        } else {
          await tx.insert(files).values({
            id: fileId,
            repositoryId: resolved.repo.id,
            path,
            content,
            lastCommitId: commitId,
          });
        }

        await tx.insert(fileVersions).values({
          id: crypto.randomUUID(),
          fileId,
          commitId,
          path,
          content,
          timestamp: now
        });

        const allFiles = await tx.select().from(files).where(eq(files.repositoryId, resolved.repo.id));
        const lang = detectLanguage(allFiles.map(f => f.path));
        await tx.update(repositories)
          .set({ updatedAt: now, language: lang })
          .where(eq(repositories.id, resolved.repo.id));
      });

      await invalidateRepositoryCache(resolved.repo.id);
      res.json({ success: true });
    } catch (error) {
      handleRequestError(res, error, 'File write error:');
    }
  });

  app.delete('/api/repos/:username/:repoName/files/:path', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const commitMessage = readOptionalString(req.body.commitMessage, { field: 'commit message', maxLength: INPUT_LIMITS.commitMessage });
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });
      const defaultBranch = await getRepositoryDefaultBranch(resolved.repo.id);
      if (!(await enforceDirectWritePolicy(resolved.repo, defaultBranch, res))) return;

      const commitId = crypto.randomUUID();
      const now = new Date();
      await db.transaction(async (tx) => {
        const fileToDelete = await tx.select().from(files)
          .where(and(eq(files.repositoryId, resolved.repo.id), eq(files.path, req.params.path))).limit(1);

        await tx.delete(files)
          .where(and(eq(files.repositoryId, resolved.repo.id), eq(files.path, req.params.path)));

        await tx.insert(commits).values({
          id: commitId,
          repositoryId: resolved.repo.id,
          message: commitMessage || 'Delete file',
          authorId: userId,
          branchName: defaultBranch,
          timestamp: now,
        });

        if (fileToDelete.length > 0) {
          await tx.insert(fileVersions).values({
            id: crypto.randomUUID(),
            fileId: fileToDelete[0].id,
            commitId,
            path: req.params.path,
            content: '',
            timestamp: now
          });
        }
      });

      await invalidateRepositoryCache(resolved.repo.id);
      res.json({ success: true });
    } catch (error) {
      handleRequestError(res, error, 'Delete file error:');
    }
  });

  // --- Issues Routes ---
  app.get('/api/repos/:username/:repoName/issues', optionalAuthenticate, async (req, res) => {
    try {
      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0) return res.status(404).json({ error: 'User not found' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });
      if (!(await requireRepositoryReadAccess(repo[0], (req as any).userId, res))) return;

      const repoIssues = await db.select({
        id: issues.id,
        title: issues.title,
        description: issues.description,
        status: issues.status,
        createdAt: issues.createdAt,
        creatorUsername: users.username
      }).from(issues)
        .leftJoin(users, eq(issues.creatorId, users.id))
        .where(eq(issues.repositoryId, repo[0].id))
        .orderBy(desc(issues.createdAt));

      res.json(repoIssues);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/repos/:username/:repoName/issues/:issueId/comments', optionalAuthenticate, async (req, res) => {
    try {
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await requireRepositoryReadAccess(resolved.repo, (req as any).userId, res))) return;
      const issue = await db.select().from(issues)
        .where(and(eq(issues.id, req.params.issueId), eq(issues.repositoryId, resolved.repo.id)))
        .limit(1);
      if (issue.length === 0) return res.status(404).json({ error: 'Issue not found' });
      const comments = await db.select({
        id: issueComments.id,
        content: issueComments.content,
        createdAt: issueComments.createdAt,
        authorUsername: users.username,
        authorAvatarUrl: users.avatarUrl
      }).from(issueComments)
        .leftJoin(users, eq(issueComments.authorId, users.id))
        .where(eq(issueComments.issueId, req.params.issueId))
        .orderBy(issueComments.createdAt);

      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/issues/:issueId/comments', authenticate, async (req, res) => {
    try {
      const content = readString(req.body.content, { field: 'comment', maxLength: INPUT_LIMITS.issueComment, allowEmpty: false });
      const userId = (req as any).userId;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canReadRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Repository access denied' });
      const issue = await db.select().from(issues)
        .where(and(eq(issues.id, req.params.issueId), eq(issues.repositoryId, resolved.repo.id)))
        .limit(1);
      if (issue.length === 0) return res.status(404).json({ error: 'Issue not found' });

      const commentId = crypto.randomUUID();
      await db.insert(issueComments).values({
        id: commentId,
        issueId: req.params.issueId,
        authorId: userId,
        content,
        createdAt: new Date(),
      });

      res.json({ success: true });
    } catch (error) {
      handleRequestError(res, error, 'Issue comment creation error:');
    }
  });

  app.patch('/api/repos/:username/:repoName/issues/:issueId', authenticate, async (req, res) => {
    try {
      const status = readString(req.body.status, { field: 'status', maxLength: 20, allowEmpty: false, pattern: /^(open|closed)$/ });
      const userId = (req as any).userId;

      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });
      const issue = await db.select().from(issues)
        .where(and(eq(issues.id, req.params.issueId), eq(issues.repositoryId, resolved.repo.id)))
        .limit(1);
      if (issue.length === 0) return res.status(404).json({ error: 'Issue not found' });

      await db.update(issues)
        .set({ status })
        .where(eq(issues.id, issue[0].id));

      res.json({ success: true });
    } catch (error) {
      handleRequestError(res, error, 'Issue update error:');
    }
  });
  app.post('/api/repos/:username/:repoName/issues', authenticate, async (req, res) => {
    try {
      const title = readString(req.body.title, { field: 'title', maxLength: INPUT_LIMITS.title, allowEmpty: false });
      const description = readOptionalString(req.body.description, { field: 'description', maxLength: INPUT_LIMITS.longDescription });
      const userId = (req as any).userId;

      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });

      const issueId = crypto.randomUUID();
      await db.insert(issues).values({
        id: issueId,
        repositoryId: resolved.repo.id,
        title,
        description,
        creatorId: userId,
        createdAt: new Date(),
      });

      res.json({ success: true, issueId });
    } catch (error) {
      handleRequestError(res, error, 'Issue creation error:');
    }
  });

  // --- Search ---
  app.get('/api/search', optionalAuthenticate, async (req, res) => {
    try {
      let q = readSearchQuery(req.query.q);
      if (!q) return res.json({ users: [], repositories: [] });

      let ownerFilter = null;
      const ownerMatch = q.match(/^owner:([a-zA-Z0-9._-]+)\s*(.*)/i);
      if (ownerMatch) {
        ownerFilter = ownerMatch[1];
        q = ownerMatch[2] || '';
      }

      const searchUsers = await db.select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl
      }).from(users).where(or(ilike(users.username, `%${q}%`), ilike(users.displayName, `%${q}%`))).limit(5);

      let repoQuery = db.select({
        id: repositories.id,
        name: repositories.name,
        description: repositories.description,
        ownerUsername: users.username,
        ownerId: repositories.ownerId,
        isPrivate: repositories.isPrivate,
      }).from(repositories)
        .leftJoin(users, eq(repositories.ownerId, users.id))
        .where(
          and(
            q ? ilike(repositories.name, `%${q}%`) : undefined,
            ownerFilter ? ilike(users.username, ownerFilter) : undefined
          )
        ).limit(10);

      const searchRepos = await repoQuery;

      const currentUserId = (req as any).userId;
      const visibleRepos = [];
      for (const repo of searchRepos) {
        if (await canReadRepository(repo, currentUserId)) {
          visibleRepos.push({
            id: repo.id,
            name: repo.name,
            description: repo.description,
            ownerUsername: repo.ownerUsername,
          });
        }
      }

      res.json({ users: searchUsers, repositories: visibleRepos });
    } catch (error) {
      handleRequestError(res, error, 'Search error:');
    }
  });

  app.post('/api/users/:username/pins', authenticate, async (req, res) => {
    try {
      const repoIds = req.body.repoIds === undefined ? [] : readStringArray(req.body.repoIds, {
        field: 'repoIds',
        itemField: 'repo id',
        maxItems: INPUT_LIMITS.pinCount,
        maxItemLength: 128,
      });
      const userId = (req as any).userId;

      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0 || user[0].id !== userId) return res.status(403).json({ error: 'Unauthorized' });

      await db.update(repositories).set({ isPinned: false }).where(eq(repositories.ownerId, userId));

      if (repoIds && repoIds.length > 0) {
        await db.update(repositories)
          .set({ isPinned: true })
          .where(and(eq(repositories.ownerId, userId), inArray(repositories.id, repoIds)));
      }

      res.json({ success: true });
    } catch (error) {
      handleRequestError(res, error, 'Error updating pins:');
    }
  });

  // --- DOCUMENTATION ENDPOINT ---
  app.get("/api/docs/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      
      // Security: Only allow reading specific documentation files from the root
      const allowedFiles = [
        "LICENSE", "README.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md",
        "SECURITY.md", "SUPPORT.md", "AUTHORS.md", "CREDITS.md",
        "ROADMAP.md", "ARCHITECTURE.md", "THE_ANOMALY_MANIFESTO.md",
        "GLOSSARY.md", "STYLE_GUIDE.md", "CODING_STANDARDS.md",
        "DEPRECATION_POLICY.md", "BETA_TESTER_AGREEMENT.md",
        "API_USAGE_POLICY.md", "SERVICE_LEVEL_AGREEMENT.md",
        "DATA_RETENTION_POLICY.md", "PRIVACY.md", "TERMS.md",
        "ACCEPTABLE_USE_POLICY.md", "DMCA.md", "TRADEMARK.md",
        "LAW_ENFORCEMENT_GUIDELINES.md", "EXPORT_COMPLIANCE.md",
        "ETHICAL_AI_POLICY.md", "INCIDENT_RESPONSE_PLAN.md",
        "VULNERABILITY_MANAGEMENT.md", "VULNERABILITY_DISCLOSURE_POLICY.md",
        "ANTI_CORRUPTION_POLICY.md", "ENVIRONMENTAL_IMPACT.md",
        "DIVERSITY_INCLUSION_CHARTER.md", "ACCESSIBILITY_STATEMENT.md",
        "DATA_CLASSIFICATION_POLICY.md", "CRYPTOGRAPHIC_STANDARDS.md",
        "DISASTER_RECOVERY_PROTOCOL.md", "SOVEREIGN_IDENTITY_CHARTER.md",
        "SUPPLY_CHAIN_ETHICS.md", "WHISTLEBLOWER_POLICY.md",
        "LOCAL_DEVELOPMENT_GUIDE.md", "TESTING_STANDARDS.md",
        "BRANCHING_STRATEGY.md", "SOCIAL_MEDIA_POLICY.md",
        "CODE_REVIEW_CHECKLIST.md", "BRAND_ASSETS_GUIDE.md",
        "ISSUE_TRIAGE_POLICY.md", "LABEL_GUIDELINES.md",
        "ACCESSIBILITY_AUDIT.md", "PROJECT_STATUS.md",
        "RELEASES.md", "USER_MANUAL.md", "API_REFERENCE.md",
        "SUBPROCESSORS.md", "CSR_POLICY.md", "DPIA_POLICY.md",
        "PRIVACY_BY_DESIGN.md", "RECORDS_MANAGEMENT.md",
        "RETENTION_SCHEDULE.md", "CYBER_HYGIENE.md", "SRE_CHARTER.md",
        "DEVOPS_HANDBOOK.md", "SECURITY_PLAYBOOK.md",
        "DEPLOYMENT_PLAYBOOK.md", "ANTI_MONEY_LAUNDERING.md",
        "TAX_GOVERNANCE.md", "GIFTS_POLICY.md", "CONFLICT_OF_INTEREST_FORM.md",
        "NON_SOLICITATION.md", "ADVISORY_BOARD.md", "BETA_TOS.md",
        "API_SLA.md", "DATA_SHARING_AGREEMENT.md", "EU_SCC_ADDENDUM.md",
        "SCHEMA_GUIDE.md", "OPEN_SOURCE_STRATEGY.md", "INTERNAL_AUDIT.md",
        "COMPLIANCE_MANUAL.md", "REMEDIATION_PLAN.md", "CHANGE_MANAGEMENT.md",
        "VENDOR_RISK_ASSESSMENT.md", "IT_ASSET_POLICY.md", "TROUBLESHOOTING.md",
        "STAKEHOLDER_ENGAGEMENT_POLICY.md", "ESG_COMMITMENT.md", "GOVERNANCE_CHARTER.md",
        "HUMAN_RIGHTS_POLICY.md", "MODERN_SLAVERY_STATEMENT.md", "NDA_TEMPLATE.md",
        "DATA_PORTABILITY_GUIDE.md", "THIRD_PARTY_LICENSES.md"
      ];

      if (!allowedFiles.includes(filename)) {
        return res.status(403).json({ error: "Access denied to requested file." });
      }

      const filePath = path.join(process.cwd(), filename);
      const content = await fs.readFile(filePath, "utf-8");
      res.json({ filename, content });
    } catch (error) {
      console.error("Error reading documentation file:", error);
      res.status(500).json({ error: "Failed to read documentation file." });
    }
  });
}

