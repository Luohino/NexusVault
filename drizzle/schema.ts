import { pgTable, foreignKey, text, timestamp, boolean, integer, unique, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const commits = pgTable("commits", {
	id: text().primaryKey().notNull(),
	repositoryId: text("repository_id").notNull(),
	message: text().notNull(),
	authorId: text("author_id").notNull(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "commits_author_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.repositoryId],
			foreignColumns: [repositories.id],
			name: "commits_repository_id_repositories_id_fk"
		}),
]);

export const files = pgTable("files", {
	id: text().primaryKey().notNull(),
	repositoryId: text("repository_id").notNull(),
	path: text().notNull(),
	content: text().notNull(),
	lastCommitId: text("last_commit_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.lastCommitId],
			foreignColumns: [commits.id],
			name: "files_last_commit_id_commits_id_fk"
		}),
	foreignKey({
			columns: [table.repositoryId],
			foreignColumns: [repositories.id],
			name: "files_repository_id_repositories_id_fk"
		}),
]);

export const issues = pgTable("issues", {
	id: text().primaryKey().notNull(),
	repositoryId: text("repository_id").notNull(),
	title: text().notNull(),
	description: text(),
	creatorId: text("creator_id").notNull(),
	status: text().default('open'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [users.id],
			name: "issues_creator_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.repositoryId],
			foreignColumns: [repositories.id],
			name: "issues_repository_id_repositories_id_fk"
		}),
]);

export const repositories = pgTable("repositories", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isPrivate: boolean("is_private").default(false),
	ownerId: text("owner_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	starCount: integer("star_count").default(0),
	forkCount: integer("fork_count").default(0),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "repositories_owner_id_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	username: text().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	displayName: text("display_name"),
	avatarUrl: text("avatar_url"),
	bio: text(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
	location: text(),
	pronouns: text(),
}, (table) => [
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
]);

export const issueComments = pgTable("issue_comments", {
	id: text().primaryKey().notNull(),
	issueId: text("issue_id").notNull(),
	authorId: text("author_id").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "issue_comments_author_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.issueId],
			foreignColumns: [issues.id],
			name: "issue_comments_issue_id_issues_id_fk"
		}),
]);

export const stars = pgTable("stars", {
	userId: text("user_id").notNull(),
	repositoryId: text("repository_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.repositoryId],
			foreignColumns: [repositories.id],
			name: "stars_repository_id_repositories_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "stars_user_id_users_id_fk"
		}),
	primaryKey({ columns: [table.userId, table.repositoryId], name: "stars_user_id_repository_id_pk"}),
]);

export const followers = pgTable("followers", {
	followerId: text("follower_id").notNull(),
	followingId: text("following_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.followerId],
			foreignColumns: [users.id],
			name: "followers_follower_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.followingId],
			foreignColumns: [users.id],
			name: "followers_following_id_users_id_fk"
		}),
	primaryKey({ columns: [table.followerId, table.followingId], name: "followers_follower_id_following_id_pk"}),
]);
