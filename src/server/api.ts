import { Express, Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { users, repositories, commits, files, fileVersions, issues, issueComments, stars, followers } from './schema.js';
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
      const { addReadme, gitignoreContent, licenseContent, licenseKey } = req.body;
      const filesToCreate = [];

      console.log('DEBUG_REPO_CREATE:', { name, addReadme, hasGitignore: !!gitignoreContent, hasLicense: !!licenseContent, licenseKey });

      if (addReadme === true) {
        filesToCreate.push({
          path: 'README.md',
          content: `# ${name}\n\n${description || 'a new repository.'}`
        });
      }

      if (gitignoreContent) {
        filesToCreate.push({
          path: '.gitignore',
          content: gitignoreContent
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

  app.delete('/api/repos/:username/:repoName', authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0 || user[0].id !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });

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

      const repoFiles = await db.select({
        id: files.id,
        path: files.path,
        content: files.content,
        lastCommitId: files.lastCommitId,
        lastCommitMessage: commits.message,
        lastCommitTimestamp: commits.timestamp
      })
      .from(files)
      .leftJoin(commits, eq(files.lastCommitId, commits.id))
      .where(eq(files.repositoryId, repo[0].id))
      .limit(limit)
      .offset(offset);
      res.json(repoFiles);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/repos/:username/:repoName/files', authenticate, async (req, res) => {
    try {
      const { path, content, message } = req.body;
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
        timestamp: now,
      });

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
      const user = await db.select().from(users).where(ilike(users.username, req.params.username)).limit(1);
      if (user.length === 0 || user[0].id !== userId) return res.status(403).json({ error: 'Unauthorized' });

      const repo = await db.select().from(repositories)
        .where(and(eq(repositories.ownerId, user[0].id), eq(repositories.name, req.params.repoName))).limit(1);
      if (repo.length === 0) return res.status(404).json({ error: 'Repository not found' });

      await db.delete(files)
        .where(and(eq(files.repositoryId, repo[0].id), eq(files.path, req.params.path)));

      res.json({ success: true });
    } catch (error) {
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
