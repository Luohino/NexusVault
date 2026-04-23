import { relations } from "drizzle-orm/relations";
import { users, commits, repositories, files, issues, issueComments, stars, followers } from "./schema";

export const commitsRelations = relations(commits, ({one, many}) => ({
	user: one(users, {
		fields: [commits.authorId],
		references: [users.id]
	}),
	repository: one(repositories, {
		fields: [commits.repositoryId],
		references: [repositories.id]
	}),
	files: many(files),
}));

export const usersRelations = relations(users, ({many}) => ({
	commits: many(commits),
	issues: many(issues),
	repositories: many(repositories),
	issueComments: many(issueComments),
	stars: many(stars),
	followers_followerId: many(followers, {
		relationName: "followers_followerId_users_id"
	}),
	followers_followingId: many(followers, {
		relationName: "followers_followingId_users_id"
	}),
}));

export const repositoriesRelations = relations(repositories, ({one, many}) => ({
	commits: many(commits),
	files: many(files),
	issues: many(issues),
	user: one(users, {
		fields: [repositories.ownerId],
		references: [users.id]
	}),
	stars: many(stars),
}));

export const filesRelations = relations(files, ({one}) => ({
	commit: one(commits, {
		fields: [files.lastCommitId],
		references: [commits.id]
	}),
	repository: one(repositories, {
		fields: [files.repositoryId],
		references: [repositories.id]
	}),
}));

export const issuesRelations = relations(issues, ({one, many}) => ({
	user: one(users, {
		fields: [issues.creatorId],
		references: [users.id]
	}),
	repository: one(repositories, {
		fields: [issues.repositoryId],
		references: [repositories.id]
	}),
	issueComments: many(issueComments),
}));

export const issueCommentsRelations = relations(issueComments, ({one}) => ({
	user: one(users, {
		fields: [issueComments.authorId],
		references: [users.id]
	}),
	issue: one(issues, {
		fields: [issueComments.issueId],
		references: [issues.id]
	}),
}));

export const starsRelations = relations(stars, ({one}) => ({
	repository: one(repositories, {
		fields: [stars.repositoryId],
		references: [repositories.id]
	}),
	user: one(users, {
		fields: [stars.userId],
		references: [users.id]
	}),
}));

export const followersRelations = relations(followers, ({one}) => ({
	user_followerId: one(users, {
		fields: [followers.followerId],
		references: [users.id],
		relationName: "followers_followerId_users_id"
	}),
	user_followingId: one(users, {
		fields: [followers.followingId],
		references: [users.id],
		relationName: "followers_followingId_users_id"
	}),
}));