CREATE TABLE IF NOT EXISTS "releases" (
  "id" text PRIMARY KEY NOT NULL,
  "repository_id" text NOT NULL REFERENCES "repositories"("id"),
  "tag_id" text REFERENCES "tags"("id"),
  "tag_name" text NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "author_id" text NOT NULL REFERENCES "users"("id"),
  "is_draft" boolean DEFAULT false,
  "is_prerelease" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "published_at" timestamp
);

CREATE TABLE IF NOT EXISTS "release_assets" (
  "id" text PRIMARY KEY NOT NULL,
  "release_id" text NOT NULL REFERENCES "releases"("id"),
  "name" text NOT NULL,
  "size" integer NOT NULL,
  "content_type" text,
  "storage_path" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "releases_repository_id_idx" ON "releases" ("repository_id");
CREATE INDEX IF NOT EXISTS "release_assets_release_id_idx" ON "release_assets" ("release_id");
