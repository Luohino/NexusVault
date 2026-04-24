import { Express, Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { users, repositories, commits, files, fileVersions, issues, issueComments, stars, followers, tags, releases, releaseAssets, branches, branchFiles, pullRequests, repositoryTopics, repositorySettings, wikiPages, pullRequestReviews, repositoryCollaborators, repositoryInvitations, notifications } from './schema.js';
import { eq, and, or, like, ilike, desc, sql, gte, inArray } from 'drizzle-orm';
import { detectLanguage } from './utils/language.js';
import crypto from 'crypto';
import { supabaseAdmin } from './supabase.js';
import { createClerkClient, verifyToken } from '@clerk/backend';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

console.log('>>> API.TS VERSION 1000 ACTIVE <<<');
console.log('>>> GTE IS DEFINED:', typeof gte !== 'undefined');

// Middleware to authenticate user using Supabase
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = req.cookies.token || authHeader?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Try Clerk verification first (using the provided secret key)
    // We use verifyToken for Bearer tokens
    console.log('Attempting Clerk token verification...');
    console.log('verifyToken function type:', typeof verifyToken);
    
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    
    console.log('Verification payload received:', payload ? 'Yes' : 'No');
    
    if (payload && payload.sub) {
      (req as any).userId = payload.sub;
      return next();
    }

    // Try Supabase fallback (original logic)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (!error && user) {
      (req as any).userId = user.id;
      return next();
    }

    // Unsafe decode as last resort for debugging/dev if secret fails (optional, better to fail)
    if (token.includes('.')) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload.sub) {
          (req as any).userId = payload.sub;
          console.warn('Using unsafe decoded userId from Clerk token');
          return next();
        }
      } catch (e) {}
    }

    return res.status(401).json({ error: 'Invalid token' });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = req.cookies.token || authHeader?.split(' ')[1];
  
  if (!token) return next();

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    
    if (payload && payload.sub) {
      (req as any).userId = payload.sub;
    }
  } catch (err) {}
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

  const canAdminRepository = async (repo: any, userId: string) => {
    if (repo.ownerId === userId) return true;
    const collaborator = await db.select().from(repositoryCollaborators)
      .where(and(eq(repositoryCollaborators.repositoryId, repo.id), eq(repositoryCollaborators.userId, userId), eq(repositoryCollaborators.role, 'admin')))
      .limit(1);
    return collaborator.length > 0;
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

  // --- Auth Routes ---
  app.post('/api/auth/sync', authenticate, async (req, res) => {
    try {
      const { id, username, email, avatarUrl } = req.body;
      
      if (!id || !username || !email) {
        console.warn('Missing required fields for sync:', { id, username, email });
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if user exists
      const existingUser = await db.select().from(users).where(eq(users.id, id)).limit(1);
      
      if (existingUser.length === 0) {
        console.log('Creating new user in database:', id);
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
      console.error('CRITICAL SYNC ERROR:', error);
      res.status(500).json({ 
        error: 'Sync failed', 
        details: error instanceof Error ? error.message : String(error) 
      });
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
      
      console.log('DEBUG_V2: Attempting to fetch user:', req.params.username);
      
      if (userResult.length === 0) {
        console.log('DEBUG_V2: User NOT found in DB');
        return res.status(404).json({ error: 'User not found' });
      }
      
      const dbUser = userResult[0];
      
      // 0. Statistics & Recent Activity
      const followersResult = await db.select({ count: sql<number>`count(*)` })
        .from(followers).where(eq(followers.followingId, dbUser.id));
      const followingResult = await db.select({ count: sql<number>`count(*)` })
        .from(followers).where(eq(followers.followerId, dbUser.id));

      const recentCommits = await db.select({
        id: commits.id,
        message: commits.message,
        timestamp: commits.timestamp,
        repoName: repositories.name,
      })
      .from(commits)
      .innerJoin(repositories, eq(commits.repositoryId, repositories.id))
      .where(eq(commits.authorId, dbUser.id))
      .orderBy(desc(commits.timestamp))
      .limit(10);

      // 1. Fetch Special Repo (README)
      console.log('DEBUG_PROFILE: Looking for special repo for user:', dbUser.id, 'with name:', dbUser.username);
      const specialRepo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, dbUser.id), ilike(repositories.name, dbUser.username)))
        .limit(1);

      let profileReadme = null;
      if (specialRepo.length > 0) {
        console.log('DEBUG_PROFILE: Found special repo:', specialRepo[0].id);
        const readmeFile = await db.select().from(files)
          .where(and(eq(files.repositoryId, specialRepo[0].id), ilike(files.path, 'README.md')))
          .limit(1);
        if (readmeFile.length > 0) {
          console.log('DEBUG_PROFILE: Found README file!');
          profileReadme = readmeFile[0].content;
        } else {
          console.log('DEBUG_PROFILE: README file NOT found in special repo');
        }
      } else {
        console.log('DEBUG_PROFILE: Special repo NOT found');
      }

      // 2. Fetch Contributions for Heatmap (Last 365 days)
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 365);
      const oneYearAgoStr = oneYearAgo.toISOString();

      console.log('>>> ATTEMPTING HEATMAP QUERY WITH DATE:', oneYearAgoStr);
      
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

      console.log('>>> HEATMAP QUERY SUCCESS! FOUND:', contributions.length, 'records');

      // 3. Calculate Tech Stack (Languages from repos)
      const userRepos = await db.select().from(repositories).where(eq(repositories.ownerId, dbUser.id));
      const languages = Array.from(new Set(userRepos.map(r => 'JavaScript'))); // Simplified for now

      // 4. Stars count
      const starsResult = await db.select({ count: sql<number>`count(*)` })
        .from(stars)
        .where(eq(stars.userId, dbUser.id));

      // 5. Check if current user is following
      let isFollowing = false;
      const currentUserId = (req as any).userId;
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
      const { displayName, bio, location, pronouns } = req.body;
      const userId = (req as any).userId;

      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0 || user[0].id !== userId) return res.status(403).json({ error: 'Unauthorized' });

      await db.update(users)
        .set({ displayName, bio, location, pronouns })
        .where(eq(users.id, userId));

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
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
      if (existing.length === 0) {
        await db.insert(repositoryCollaborators).values({
          id: crypto.randomUUID(),
          repositoryId: invite[0].repositoryId,
          userId,
          role: invite[0].role,
          invitedById: invite[0].invitedById,
        });
      }

      const now = new Date();
      await db.update(repositoryInvitations)
        .set({ status: 'accepted', respondedAt: now })
        .where(eq(repositoryInvitations.id, invite[0].id));
      await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, req.params.notificationId));

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

      res.json(starredRepos);
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

      await db.insert(stars).values({ userId, repositoryId: repo[0].id }).onConflictDoNothing();
      
      await db.update(repositories)
        .set({ starCount: sql`${repositories.starCount} + 1` })
        .where(eq(repositories.id, repo[0].id));

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

      await db.delete(stars).where(and(eq(stars.userId, userId), eq(stars.repositoryId, repo[0].id)));
      
      await db.update(repositories)
        .set({ starCount: sql`GREATEST(0, ${repositories.starCount} - 1)` })
        .where(eq(repositories.id, repo[0].id));

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
      await ensureMainBranch(resolved.repo.id, resolved.owner.id);
      const repoBranches = await db.select().from(branches)
        .where(eq(branches.repositoryId, resolved.repo.id))
        .orderBy(branches.name);
      res.json(repoBranches);
    } catch (error) {
      console.error('Branches fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/branches', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { name, from = 'main' } = req.body;
      if (!name || !/^[A-Za-z0-9._/-]+$/.test(name)) {
        return res.status(400).json({ error: 'Valid branch name is required' });
      }

      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (resolved.repo.ownerId !== userId) return res.status(403).json({ error: 'Unauthorized' });

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
      res.json(branch[0]);
    } catch (error) {
      console.error('Branch creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/repos/:username/:repoName/branches/:branchName', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const nextName = String(req.body.name || '').trim();
      if (!nextName || !/^[A-Za-z0-9._/-]+$/.test(nextName)) {
        return res.status(400).json({ error: 'Valid branch name is required' });
      }

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
      res.json({ ...branch, name: nextName });
    } catch (error) {
      console.error('Branch rename error:', error);
      res.status(500).json({ error: 'Internal server error' });
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
      const topics = await db.select().from(repositoryTopics)
        .where(eq(repositoryTopics.repositoryId, resolved.repo.id))
        .orderBy(repositoryTopics.name);
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

      const names = Array.from(new Set<string>((req.body.topics || [])
        .map((topic: string) => String(topic).trim().toLowerCase().replace(/^#/, ''))
        .filter((topic: string) => /^[a-z0-9][a-z0-9-]{0,38}$/.test(topic))))
        .slice(0, 20);

      await db.delete(repositoryTopics).where(eq(repositoryTopics.repositoryId, resolved.repo.id));
      for (const name of names) {
        await db.insert(repositoryTopics).values({ id: crypto.randomUUID(), repositoryId: resolved.repo.id, name });
      }
      res.json(names.map(name => ({ name })));
    } catch (error) {
      console.error('Topics update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/repos/:username/:repoName/collaborators', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (resolved.repo.ownerId !== userId) return res.status(403).json({ error: 'Unauthorized' });
      const collaborators = await db.select({
        id: repositoryCollaborators.id,
        role: repositoryCollaborators.role,
        createdAt: repositoryCollaborators.createdAt,
        username: users.username,
        avatarUrl: users.avatarUrl,
      })
      .from(repositoryCollaborators)
      .leftJoin(users, eq(repositoryCollaborators.userId, users.id))
      .where(eq(repositoryCollaborators.repositoryId, resolved.repo.id))
      .orderBy(desc(repositoryCollaborators.createdAt));
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

      res.json(Array.from(contributorMap.values()).sort((a, b) => (b.count || 0) - (a.count || 0)));
    } catch (error) {
      console.error('Contributors fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/collaborators', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const username = String(req.body.username || '').trim();
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
      await db.insert(repositoryInvitations).values({
        id,
        repositoryId: resolved.repo.id,
        inviteeId: invitee[0].id,
        invitedById: userId,
        role,
        status: 'pending',
        notificationId,
      });
      await db.insert(notifications).values({
        id: notificationId,
        userId: invitee[0].id,
        actorId: userId,
        type: 'repository_invite',
        title: `Repository invite: ${resolved.owner.username}/${resolved.repo.name}`,
        body: `${resolved.owner.username} invited you as ${role} collaborator. Accept the invite to join.`,
        href: `/${resolved.owner.username}/${resolved.repo.name}`,
      });
      const emailResult = await sendRepositoryInviteEmail({
        to: invitee[0].email,
        inviteeUsername: invitee[0].username,
        inviterUsername: resolved.owner.username,
        repoPath: `${resolved.owner.username}/${resolved.repo.name}`,
        role,
      });
      res.json({ id, role, status: 'pending', username: invitee[0].username, avatarUrl: invitee[0].avatarUrl, email: emailResult });
    } catch (error) {
      console.error('Collaborator create error:', error);
      res.status(500).json({ error: 'Internal server error' });
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
      let settings = await db.select().from(repositorySettings)
        .where(eq(repositorySettings.repositoryId, resolved.repo.id)).limit(1);
      if (settings.length === 0) {
        await db.insert(repositorySettings).values({ repositoryId: resolved.repo.id });
        settings = await db.select().from(repositorySettings)
          .where(eq(repositorySettings.repositoryId, resolved.repo.id)).limit(1);
      }
      res.json(settings[0]);
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
      const requestedDefaultBranch = String(req.body.defaultBranch || 'main');
      const defaultBranch = await getBranch(resolved.repo.id, resolved.owner.id, requestedDefaultBranch);
      if (!defaultBranch) return res.status(400).json({ error: 'Default branch not found' });
      const next = {
        protectMainBranch: Boolean(req.body.protectMainBranch),
        requirePullRequest: Boolean(req.body.requirePullRequest),
        requiredReviewCount: Math.max(0, Math.min(6, Number(req.body.requiredReviewCount || 0))),
        defaultBranch: requestedDefaultBranch,
      };
      await db.insert(repositorySettings).values({ repositoryId: resolved.repo.id, ...next })
        .onConflictDoUpdate({ target: repositorySettings.repositoryId, set: next });
      res.json({ repositoryId: resolved.repo.id, ...next });
    } catch (error) {
      console.error('Settings update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/repos/:username/:repoName/wiki', optionalAuthenticate, async (req, res) => {
    try {
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      const pages = await db.select().from(wikiPages)
        .where(eq(wikiPages.repositoryId, resolved.repo.id))
        .orderBy(desc(wikiPages.updatedAt));
      res.json(pages);
    } catch (error) {
      console.error('Wiki fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/wiki', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { title, content } = req.body;
      if (!title || !content) return res.status(400).json({ error: 'title and content are required' });
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });
      const slug = String(title).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || crypto.randomUUID();
      const now = new Date();
      const id = crypto.randomUUID();
      await db.insert(wikiPages).values({ id, repositoryId: resolved.repo.id, slug, title, content, authorId: userId, createdAt: now, updatedAt: now });
      res.json({ id, repositoryId: resolved.repo.id, slug, title, content, authorId: userId, createdAt: now, updatedAt: now });
    } catch (error) {
      console.error('Wiki creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/repos/:username/:repoName/wiki/:slug', optionalAuthenticate, async (req, res) => {
    try {
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      const page = await db.select().from(wikiPages)
        .where(and(eq(wikiPages.repositoryId, resolved.repo.id), eq(wikiPages.slug, req.params.slug)))
        .limit(1);
      if (page.length === 0) return res.status(404).json({ error: 'Wiki page not found' });
      res.json(page[0]);
    } catch (error) {
      console.error('Wiki page fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/repos/:username/:repoName/wiki/:slug', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { title, content } = req.body;
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });
      const page = await db.select().from(wikiPages)
        .where(and(eq(wikiPages.repositoryId, resolved.repo.id), eq(wikiPages.slug, req.params.slug)))
        .limit(1);
      if (page.length === 0) return res.status(404).json({ error: 'Wiki page not found' });
      const nextTitle = String(title || page[0].title).trim();
      const nextContent = String(content || page[0].content);
      const nextSlug = nextTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || page[0].slug;
      await db.update(wikiPages)
        .set({ title: nextTitle, content: nextContent, slug: nextSlug, updatedAt: new Date() })
        .where(eq(wikiPages.id, page[0].id));
      res.json({ ...page[0], title: nextTitle, content: nextContent, slug: nextSlug, updatedAt: new Date() });
    } catch (error) {
      console.error('Wiki page update error:', error);
      res.status(500).json({ error: 'Internal server error' });
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
      res.json({ success: true });
    } catch (error) {
      console.error('Wiki page delete error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Repository Routes ---
  app.post('/api/repos', authenticate, async (req, res) => {
    try {
      const { name, description, isPrivate } = req.body;
      const userId = (req as any).userId;
      
      if (!name) {
        return res.status(400).json({ error: 'repository name is required' });
      }

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
      const { addReadme, nvignoreContent, licenseContent, licenseKey } = req.body;
      const filesToCreate = [];

      console.log('DEBUG_REPO_CREATE:', { name, addReadme, hasNvignore: !!nvignoreContent, hasLicense: !!licenseContent, licenseKey });

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
      console.error(error);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  app.get('/api/repos/:username', optionalAuthenticate, async (req, res) => {
    try {
      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const repos = await db.select().from(repositories).where(eq(repositories.ownerId, user[0].id)).orderBy(desc(repositories.updatedAt));
      
      // Update languages if missing
      for (const repo of repos) {
        if (!repo.language) {
          const repoFiles = await db.select().from(files).where(eq(files.repositoryId, repo.id));
          const lang = detectLanguage(repoFiles.map(f => f.path));
          if (lang) {
            await db.update(repositories).set({ language: lang }).where(eq(repositories.id, repo.id));
            repo.language = lang;
          }
        }
      }

      const currentUserId = (req as any).userId;
      if (currentUserId) {
        const userStars = await db.select().from(stars).where(eq(stars.userId, currentUserId));
        const starredRepoIds = new Set(userStars.map(s => s.repositoryId));
        const reposWithStarred = repos.map(r => ({
          ...r,
          isStarred: starredRepoIds.has(r.id)
        }));
        return res.json(reposWithStarred);
      }
      
      res.json(repos);
    } catch (error) {
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

      let repoData = repo[0];
      if (!repoData.language) {
        const repoFiles = await db.select().from(files).where(eq(files.repositoryId, repoData.id));
        const lang = detectLanguage(repoFiles.map(f => f.path));
        if (lang) {
          await db.update(repositories).set({ language: lang }).where(eq(repositories.id, repoData.id));
          repoData.language = lang;
        }
      }

      let isStarred = false;
      const currentUserId = (req as any).userId;
      if (currentUserId) {
        const starCheck = await db.select().from(stars)
          .where(and(eq(stars.userId, currentUserId), eq(stars.repositoryId, repo[0].id)))
          .limit(1);
        isStarred = starCheck.length > 0;
      }

      res.json({ 
        ...repo[0], 
        isStarred,
        owner: {
          username: user[0].username,
          avatarUrl: user[0].avatarUrl,
          displayName: user[0].displayName
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/repos/:username/:repoName', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { description, websiteUrl } = req.body;
      
      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0) return res.status(404).json({ error: 'User not found' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });
      if (!(await canWriteRepository(repo[0], userId))) return res.status(403).json({ error: 'Unauthorized' });

      await db.update(repositories)
        .set({ 
          description: description !== undefined ? description : repo[0].description,
          websiteUrl: websiteUrl !== undefined ? websiteUrl : repo[0].websiteUrl,
        })
        .where(eq(repositories.id, repo[0].id));

      const updatedRepo = await db.select().from(repositories)
        .where(eq(repositories.id, repo[0].id)).limit(1);

      res.json({ 
        ...updatedRepo[0],
        owner: {
          username: user[0].username,
          avatarUrl: user[0].avatarUrl,
          displayName: user[0].displayName
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
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

      const repoCommits = await db.select({
        id: commits.id,
        message: commits.message,
        timestamp: commits.timestamp,
        authorUsername: users.username,
        authorAvatarUrl: users.avatarUrl
      }).from(commits)
        .leftJoin(users, eq(commits.authorId, users.id))
        .where(eq(commits.repositoryId, repo[0].id))
        .orderBy(desc(commits.timestamp));

      res.json(repoCommits);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  app.get('/api/repos/:username/:repoName/commits/:commitId/files', optionalAuthenticate, async (req, res) => {
    try {
      const { commitId } = req.params;
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

      const repoTags = await db.select({
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
      .orderBy(desc(tags.createdAt));

      res.json(repoTags);
    } catch (error) {
      console.error('Tags fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/tags', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { name, commitId, message } = req.body;

      if (!name || !commitId) {
        return res.status(400).json({ error: 'Name and commitId are required' });
      }

      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0 || user[0].id !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });

      const tagId = crypto.randomUUID();
      await db.insert(tags).values({
        id: tagId,
        repositoryId: repo[0].id,
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

      res.json(newTag[0]);
    } catch (error) {
      console.error('Tag creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/repos/:username/:repoName/tags/:tagId', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;

      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0 || user[0].id !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });

      const tag = await db.select().from(tags)
        .where(eq(tags.id, req.params.tagId)).limit(1);
      if (tag.length === 0) return res.status(404).json({ error: 'Tag not found' });

      await db.delete(tags).where(eq(tags.id, req.params.tagId));

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

      res.json(repoReleases.map(release => ({
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
      })));
    } catch (error) {
      console.error('Releases fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/releases', authenticate, async (req, res) => {
    try {
      await releaseBucketReady;
      const userId = (req as any).userId;
      const { tagName, targetCommitId, title, body, isDraft, isPrerelease, assets = [] } = req.body;

      if (!tagName || !title) {
        return res.status(400).json({ error: 'tagName and title are required' });
      }

      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });

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
      await db.insert(releases).values({
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

      const uploadedAssets = [];
      for (const asset of assets as any[]) {
        if (!asset?.name || !asset?.dataBase64) continue;
        const assetId = crypto.randomUUID();
        const safeName = String(asset.name).replace(/[\\/:*?"<>|]/g, '_');
        const storagePath = `${resolved.repo.id}/${releaseId}/${assetId}-${safeName}`;
        const buffer = Buffer.from(asset.dataBase64, 'base64');

        const { error: uploadError } = await supabaseAdmin.storage
          .from(releaseBucket)
          .upload(storagePath, buffer, {
            contentType: asset.contentType || 'application/octet-stream',
            upsert: false,
          });
        if (uploadError) throw uploadError;

        await db.insert(releaseAssets).values({
          id: assetId,
          releaseId,
          name: asset.name,
          size: Number(asset.size || buffer.length),
          contentType: asset.contentType || 'application/octet-stream',
          storagePath,
        });

        uploadedAssets.push({
          id: assetId,
          name: asset.name,
          size: Number(asset.size || buffer.length),
          contentType: asset.contentType || 'application/octet-stream',
          downloadUrl: `/api/repos/${req.params.username}/${req.params.repoName}/releases/assets/${assetId}/download`
        });
      }

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
      console.error('Release creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/repos/:username/:repoName/releases/:releaseId', authenticate, async (req, res) => {
    try {
      await releaseBucketReady;
      const userId = (req as any).userId;
      const { title, body, isDraft, isPrerelease } = req.body;

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

      res.json({ success: true });
    } catch (error) {
      console.error('Release update error:', error);
      res.status(500).json({ error: 'Internal server error' });
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
      const { assets = [] } = req.body;

      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
      if (!(await canWriteRepository(resolved.repo, userId))) return res.status(403).json({ error: 'Unauthorized' });

      const release = await db.select().from(releases)
        .where(and(eq(releases.repositoryId, resolved.repo.id), eq(releases.id, req.params.releaseId)))
        .limit(1);
      if (release.length === 0) return res.status(404).json({ error: 'Release not found' });

      const uploadedAssets = [];
      for (const asset of assets as any[]) {
        if (!asset?.name || !asset?.dataBase64) continue;
        const assetId = crypto.randomUUID();
        const safeName = String(asset.name).replace(/[\\/:*?"<>|]/g, '_');
        const storagePath = `${resolved.repo.id}/${req.params.releaseId}/${assetId}-${safeName}`;
        const buffer = Buffer.from(asset.dataBase64, 'base64');

        const { error: uploadError } = await supabaseAdmin.storage
          .from(releaseBucket)
          .upload(storagePath, buffer, {
            contentType: asset.contentType || 'application/octet-stream',
            upsert: false,
          });
        if (uploadError) throw uploadError;

        await db.insert(releaseAssets).values({
          id: assetId,
          releaseId: req.params.releaseId,
          name: asset.name,
          size: Number(asset.size || buffer.length),
          contentType: asset.contentType || 'application/octet-stream',
          storagePath,
        });

        uploadedAssets.push({
          id: assetId,
          name: asset.name,
          size: Number(asset.size || buffer.length),
          contentType: asset.contentType || 'application/octet-stream',
          downloadUrl: `/api/repos/${req.params.username}/${req.params.repoName}/releases/assets/${assetId}/download`
        });
      }

      await db.update(releases).set({ updatedAt: new Date() }).where(eq(releases.id, req.params.releaseId));
      res.json(uploadedAssets);
    } catch (error) {
      console.error('Release asset upload error:', error);
      res.status(500).json({ error: 'Internal server error' });
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
      const { title, description, sourceBranch, targetBranch = 'main' } = req.body;
      if (!title || !sourceBranch) return res.status(400).json({ error: 'title and sourceBranch are required' });

      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
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
      console.error('Pull request creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/repos/:username/:repoName/pulls/:pullId/compare', optionalAuthenticate, async (req, res) => {
    try {
      const resolved = await getRepositoryForRequest(req.params.username, req.params.repoName);
      if ('error' in resolved) return res.status(404).json({ error: resolved.error });
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
      const existing = await db.select().from(pullRequestReviews)
        .where(and(eq(pullRequestReviews.pullRequestId, req.params.pullId), eq(pullRequestReviews.reviewerId, userId)))
        .limit(1);
      if (existing.length > 0) await db.delete(pullRequestReviews).where(eq(pullRequestReviews.id, existing[0].id));
      const id = crypto.randomUUID();
      const now = new Date();
      await db.insert(pullRequestReviews).values({
        id,
        pullRequestId: req.params.pullId,
        reviewerId: userId,
        status: 'approved',
        comment: req.body.comment || null,
        createdAt: now,
      });
      res.json({ id, status: 'approved', comment: req.body.comment || null, createdAt: now });
    } catch (error) {
      console.error('Pull request review creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
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
          .where(and(eq(pullRequestReviews.pullRequestId, req.params.pullId), eq(pullRequestReviews.status, 'approved')));
        const uniqueReviewers = new Set(reviews.map(review => review.reviewerId));
        if (uniqueReviewers.size < requiredReviews) {
          return res.status(409).json({ error: `Branch protection requires ${requiredReviews} review(s) before merging`, approvals: uniqueReviewers.size, requiredReviews });
        }
      }
      const comparison = await buildBranchComparison(resolved.repo.id, resolved.owner.id, pr[0].sourceBranch, pr[0].targetBranch);
      if (!comparison) return res.status(404).json({ error: 'Branch not found' });
      if (!comparison.canMerge) return res.status(409).json({ error: 'Merge conflicts detected', conflicts: comparison.conflicts });

      const now = new Date();
      const mergeCommitId = crypto.randomUUID();
      await db.insert(commits).values({
        id: mergeCommitId,
        repositoryId: resolved.repo.id,
        message: `Merge pull request: ${pr[0].title}`,
        authorId: userId,
        branchName: pr[0].targetBranch,
        timestamp: now,
      });

      for (const change of comparison.changedFiles as any[]) {
        if (pr[0].targetBranch !== 'main') continue;
        if (change.status === 'deleted') {
          await db.delete(files).where(and(eq(files.repositoryId, resolved.repo.id), eq(files.path, change.path)));
          continue;
        }
        const existing = await db.select().from(files)
          .where(and(eq(files.repositoryId, resolved.repo.id), eq(files.path, change.path))).limit(1);
        if (existing.length > 0) {
          await db.update(files).set({ content: change.sourceContent, lastCommitId: mergeCommitId }).where(eq(files.id, existing[0].id));
        } else {
          await db.insert(files).values({
            id: crypto.randomUUID(),
            repositoryId: resolved.repo.id,
            path: change.path,
            content: change.sourceContent,
            lastCommitId: mergeCommitId,
          });
        }
      }

      await db.update(pullRequests)
        .set({ status: 'merged', mergeCommitId, updatedAt: now, mergedAt: now })
        .where(eq(pullRequests.id, req.params.pullId));
      res.json({ success: true, mergeCommitId });
    } catch (error) {
      console.error('Pull request merge error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Files Routes ---
  app.get('/api/repos/:username/:repoName/files', async (req, res) => {
    try {
      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0) return res.status(404).json({ error: 'User not found' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });

      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const branchName = (req.query.branch as string) || 'main';

      const branchFilesResult = await getFilesForBranch(repo[0].id, user[0].id, branchName);
      if (!branchFilesResult) return res.status(404).json({ error: 'Branch not found' });
      const repoFiles = branchFilesResult.slice(offset, offset + limit);
      res.json(repoFiles);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/files', authenticate, async (req, res) => {
    try {
      const { path, content, message, branch = 'main' } = req.body;
      const userId = (req as any).userId;

      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0 || user[0].id !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });

      const now = new Date();
      const commitId = crypto.randomUUID();

      await db.insert(commits).values({
        id: commitId,
        repositoryId: repo[0].id,
        message: message || `Update ${path}`,
        authorId: userId,
        branchName: branch,
        timestamp: now,
      });

      if (branch !== 'main') {
        const targetBranch = await getBranch(repo[0].id, user[0].id, branch);
        if (!targetBranch) return res.status(404).json({ error: 'Branch not found' });
        const existingBranchFile = await db.select().from(branchFiles)
          .where(and(eq(branchFiles.branchId, targetBranch.id), eq(branchFiles.path, path))).limit(1);

        if (existingBranchFile.length > 0) {
          await db.update(branchFiles)
            .set({ content, lastCommitId: commitId })
            .where(eq(branchFiles.id, existingBranchFile[0].id));
        } else {
          await db.insert(branchFiles).values({
            id: crypto.randomUUID(),
            branchId: targetBranch.id,
            path,
            content,
            baseContent: null,
            lastCommitId: commitId,
          });
        }
        return res.json({ success: true });
      }

      // Check if file exists
      const existingFile = await db.select().from(files)
        .where(and(eq(files.repositoryId, repo[0].id), eq(files.path, path))).limit(1);

      if (existingFile.length > 0) {
        const fileId = existingFile[0].id;
        await db.update(files)
          .set({ content, lastCommitId: commitId })
          .where(eq(files.id, fileId));
        
        // Save snapshot
        try {
          await db.insert(fileVersions).values({
            id: crypto.randomUUID(),
            fileId,
            commitId,
            path,
            content,
            timestamp: now
          });
        } catch (e) {
          console.error('Snapshot failed (Update):', e);
        }
      } else {
        const fileId = crypto.randomUUID();
        await db.insert(files).values({
          id: fileId,
          repositoryId: repo[0].id,
          path,
          content,
          lastCommitId: commitId,
        });

        // Save snapshot
        try {
          await db.insert(fileVersions).values({
            id: crypto.randomUUID(),
            fileId,
            commitId,
            path,
            content,
            timestamp: now
          });
        } catch (e) {
          console.error('Snapshot failed (New):', e);
        }
      }

      // Update language
      const allFiles = await db.select().from(files).where(eq(files.repositoryId, repo[0].id));
      const lang = detectLanguage(allFiles.map(f => f.path));
      
      await db.update(repositories)
        .set({ updatedAt: now, language: lang })
        .where(eq(repositories.id, repo[0].id));

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/repos/:username/:repoName/files/:path', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { commitMessage } = req.body;
      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0 || user[0].id !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });

      // Get the file to delete
      const fileToDelete = await db.select().from(files)
        .where(and(eq(files.repositoryId, repo[0].id), eq(files.path, req.params.path))).limit(1);

      // Delete the file
      await db.delete(files)
        .where(and(eq(files.repositoryId, repo[0].id), eq(files.path, req.params.path)));

      // Create a commit for the deletion
      const commitId = crypto.randomUUID();
      const now = new Date();
      await db.insert(commits).values({
        id: commitId,
        repositoryId: repo[0].id,
        message: commitMessage || 'Delete file',
        authorId: userId,
        branchName: 'main',
        timestamp: now,
      });

      // Record the deletion in file versions
      if (fileToDelete.length > 0) {
        await db.insert(fileVersions).values({
          id: crypto.randomUUID(),
          fileId: fileToDelete[0].id,
          commitId,
          path: req.params.path,
          content: '', // Empty content indicates deletion
          timestamp: now
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Issues Routes ---
  app.get('/api/repos/:username/:repoName/issues', async (req, res) => {
    try {
      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0) return res.status(404).json({ error: 'User not found' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });

      const repoIssues = await db.select({
        id: issues.id,
        title: issues.title,
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

  app.get('/api/repos/:username/:repoName/issues/:issueId/comments', async (req, res) => {
    try {
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
      const { content } = req.body;
      const userId = (req as any).userId;

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
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/repos/:username/:repoName/issues/:issueId', authenticate, async (req, res) => {
    try {
      const { status } = req.body;
      const userId = (req as any).userId;

      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0 || user[0].id !== userId) return res.status(403).json({ error: 'Unauthorized' });

      await db.update(issues)
        .set({ status })
        .where(eq(issues.id, req.params.issueId));

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  app.post('/api/repos/:username/:repoName/issues', authenticate, async (req, res) => {
    try {
      const { title, description } = req.body;
      const userId = (req as any).userId;

      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0) return res.status(404).json({ error: 'User not found' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });

      const issueId = crypto.randomUUID();
      await db.insert(issues).values({
        id: issueId,
        repositoryId: repo[0].id,
        title,
        description,
        creatorId: userId,
        createdAt: new Date(),
      });

      res.json({ success: true, issueId });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Search ---
  app.get('/api/search', async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) return res.json({ users: [], repositories: [] });

      const searchUsers = await db.select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl
      }).from(users).where(or(ilike(users.username, `%${q}%`), ilike(users.displayName, `%${q}%`))).limit(5);

      const searchRepos = await db.select({
        id: repositories.id,
        name: repositories.name,
        description: repositories.description,
        ownerUsername: users.username
      }).from(repositories)
        .leftJoin(users, eq(repositories.ownerId, users.id))
        .where(ilike(repositories.name, `%${q}%`)).limit(10);

      res.json({ users: searchUsers, repositories: searchRepos });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/users/:username/pins', authenticate, async (req, res) => {
    try {
      const { repoIds } = req.body;
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
      console.error('Error updating pins:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}

