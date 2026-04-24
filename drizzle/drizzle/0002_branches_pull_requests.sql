ALTER TABLE "commits" ADD COLUMN IF NOT EXISTS "branch_name" text DEFAULT 'main';

CREATE TABLE IF NOT EXISTS "branches" (
  "id" text PRIMARY KEY NOT NULL,
  "repository_id" text NOT NULL REFERENCES "repositories"("id"),
  "name" text NOT NULL,
  "base_branch" text DEFAULT 'main' NOT NULL,
  "created_from_commit_id" text REFERENCES "commits"("id"),
  "creator_id" text NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "branch_files" (
  "id" text PRIMARY KEY NOT NULL,
  "branch_id" text NOT NULL REFERENCES "branches"("id"),
  "path" text NOT NULL,
  "content" text NOT NULL,
  "base_content" text,
  "last_commit_id" text NOT NULL REFERENCES "commits"("id")
);

CREATE TABLE IF NOT EXISTS "pull_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "repository_id" text NOT NULL REFERENCES "repositories"("id"),
  "title" text NOT NULL,
  "description" text,
  "source_branch" text NOT NULL,
  "target_branch" text DEFAULT 'main' NOT NULL,
  "creator_id" text NOT NULL REFERENCES "users"("id"),
  "status" text DEFAULT 'open' NOT NULL,
  "merge_commit_id" text REFERENCES "commits"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "merged_at" timestamp
);

CREATE INDEX IF NOT EXISTS "branches_repository_id_idx" ON "branches" ("repository_id");
CREATE INDEX IF NOT EXISTS "branch_files_branch_id_idx" ON "branch_files" ("branch_id");
CREATE INDEX IF NOT EXISTS "pull_requests_repository_id_idx" ON "pull_requests" ("repository_id");
