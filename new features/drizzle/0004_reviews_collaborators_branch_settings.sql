ALTER TABLE "repository_settings" ADD COLUMN IF NOT EXISTS "default_branch" text DEFAULT 'main';

CREATE TABLE IF NOT EXISTS "pull_request_reviews" (
  "id" text PRIMARY KEY NOT NULL,
  "pull_request_id" text NOT NULL REFERENCES "pull_requests"("id"),
  "reviewer_id" text NOT NULL REFERENCES "users"("id"),
  "status" text DEFAULT 'approved' NOT NULL,
  "comment" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "repository_collaborators" (
  "id" text PRIMARY KEY NOT NULL,
  "repository_id" text NOT NULL REFERENCES "repositories"("id"),
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "role" text DEFAULT 'write' NOT NULL,
  "invited_by_id" text NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);
