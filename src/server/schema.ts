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
  websiteUrl: text('website_url'),
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
  branchName: text('branch_name').default('main'),
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

export const tags = pgTable('tags', {
  id: text('id').primaryKey(),
  repositoryId: text('repository_id').notNull().references(() => repositories.id),
  name: text('name').notNull(),
  commitId: text('commit_id').notNull().references(() => commits.id),
  message: text('message'),
  creatorId: text('creator_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const releases = pgTable('releases', {
  id: text('id').primaryKey(),
  repositoryId: text('repository_id').notNull().references(() => repositories.id),
  tagId: text('tag_id').references(() => tags.id),
  tagName: text('tag_name').notNull(),
  title: text('title').notNull(),
  body: text('body'),
  authorId: text('author_id').notNull().references(() => users.id),
  isDraft: boolean('is_draft').default(false),
  isPrerelease: boolean('is_prerelease').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  publishedAt: timestamp('published_at'),
});

export const releaseAssets = pgTable('release_assets', {
  id: text('id').primaryKey(),
  releaseId: text('release_id').notNull().references(() => releases.id),
  name: text('name').notNull(),
  size: integer('size').notNull(),
  contentType: text('content_type'),
  storagePath: text('storage_path').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const branches = pgTable('branches', {
  id: text('id').primaryKey(),
  repositoryId: text('repository_id').notNull().references(() => repositories.id),
  name: text('name').notNull(),
  baseBranch: text('base_branch').notNull().default('main'),
  createdFromCommitId: text('created_from_commit_id').references(() => commits.id),
  creatorId: text('creator_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const branchFiles = pgTable('branch_files', {
  id: text('id').primaryKey(),
  branchId: text('branch_id').notNull().references(() => branches.id),
  path: text('path').notNull(),
  content: text('content').notNull(),
  baseContent: text('base_content'),
  lastCommitId: text('last_commit_id').notNull().references(() => commits.id),
});

export const pullRequests = pgTable('pull_requests', {
  id: text('id').primaryKey(),
  repositoryId: text('repository_id').notNull().references(() => repositories.id),
  title: text('title').notNull(),
  description: text('description'),
  sourceBranch: text('source_branch').notNull(),
  targetBranch: text('target_branch').notNull().default('main'),
  creatorId: text('creator_id').notNull().references(() => users.id),
  status: text('status').notNull().default('open'),
  mergeCommitId: text('merge_commit_id').references(() => commits.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  mergedAt: timestamp('merged_at'),
});

export const repositoryTopics = pgTable('repository_topics', {
  id: text('id').primaryKey(),
  repositoryId: text('repository_id').notNull().references(() => repositories.id),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const repositorySettings = pgTable('repository_settings', {
  repositoryId: text('repository_id').primaryKey().references(() => repositories.id),
  protectMainBranch: boolean('protect_main_branch').default(true),
  requirePullRequest: boolean('require_pull_request').default(false),
  requiredReviewCount: integer('required_review_count').default(0),
  defaultBranch: text('default_branch').default('main'),
});

export const wikiPages = pgTable('wiki_pages', {
  id: text('id').primaryKey(),
  repositoryId: text('repository_id').notNull().references(() => repositories.id),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: text('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const pullRequestReviews = pgTable('pull_request_reviews', {
  id: text('id').primaryKey(),
  pullRequestId: text('pull_request_id').notNull().references(() => pullRequests.id),
  reviewerId: text('reviewer_id').notNull().references(() => users.id),
  status: text('status').notNull().default('approved'),
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const repositoryCollaborators = pgTable('repository_collaborators', {
  id: text('id').primaryKey(),
  repositoryId: text('repository_id').notNull().references(() => repositories.id),
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role').notNull().default('write'),
  invitedById: text('invited_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const repositoryInvitations = pgTable('repository_invitations', {
  id: text('id').primaryKey(),
  repositoryId: text('repository_id').notNull().references(() => repositories.id),
  inviteeId: text('invitee_id').notNull().references(() => users.id),
  invitedById: text('invited_by_id').notNull().references(() => users.id),
  role: text('role').notNull().default('write'),
  status: text('status').notNull().default('pending'),
  notificationId: text('notification_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  respondedAt: timestamp('responded_at'),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  actorId: text('actor_id').references(() => users.id),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body'),
  href: text('href'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
