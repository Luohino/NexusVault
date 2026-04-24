CREATE TABLE IF NOT EXISTS "repository_topics" (
  "id" text PRIMARY KEY NOT NULL,
  "repository_id" text NOT NULL REFERENCES "repositories"("id"),
  "name" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "repository_settings" (
  "repository_id" text PRIMARY KEY REFERENCES "repositories"("id"),
  "protect_main_branch" boolean DEFAULT true,
  "require_pull_request" boolean DEFAULT false,
  "required_review_count" integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "wiki_pages" (
  "id" text PRIMARY KEY NOT NULL,
  "repository_id" text NOT NULL REFERENCES "repositories"("id"),
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "author_id" text NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "repository_topics_repository_id_idx" ON "repository_topics" ("repository_id");
CREATE INDEX IF NOT EXISTS "wiki_pages_repository_id_idx" ON "wiki_pages" ("repository_id");
