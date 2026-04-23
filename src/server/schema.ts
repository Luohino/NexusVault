import { pgTable, text, integer, primaryKey, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  location: text('location'),
  pronouns: text('pronouns'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const repositories = pgTable('repositories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  isPrivate: boolean('is_private').default(false),
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  language: text('language'),
  isPinned: boolean('is_pinned').default(false),
  starCount: integer('star_count').default(0),
  forkCount: integer('fork_count').default(0),
});

export const commits = pgTable('commits', {
  id: text('id').primaryKey(),
  repositoryId: text('repository_id').notNull().references(() => repositories.id),
  message: text('message').notNull(),
  authorId: text('author_id').notNull().references(() => users.id),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

export const files = pgTable('files', {
  id: text('id').primaryKey(),
  repositoryId: text('repository_id').notNull().references(() => repositories.id),
  path: text('path').notNull(),
  content: text('content').notNull(),
  lastCommitId: text('last_commit_id').notNull().references(() => commits.id),
});

export const issues = pgTable('issues', {
  id: text('id').primaryKey(),
  repositoryId: text('repository_id').notNull().references(() => repositories.id),
  title: text('title').notNull(),
  description: text('description'),
  creatorId: text('creator_id').notNull().references(() => users.id),
  status: text('status').default('open'), // 'open' | 'closed'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const issueComments = pgTable('issue_comments', {
  id: text('id').primaryKey(),
  issueId: text('issue_id').notNull().references(() => issues.id),
  authorId: text('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const stars = pgTable('stars', {
  userId: text('user_id').notNull().references(() => users.id),
  repositoryId: text('repository_id').notNull().references(() => repositories.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.repositoryId] }),
}));

export const followers = pgTable('followers', {
  followerId: text('follower_id').notNull().references(() => users.id),
  followingId: text('following_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.followerId, t.followingId] }),
}));

export const fileVersions = pgTable('file_versions', {
  id: text('id').primaryKey(),
  fileId: text('file_id').notNull().references(() => files.id),
  commitId: text('commit_id').notNull().references(() => commits.id),
  path: text('path').notNull(),
  content: text('content').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});
