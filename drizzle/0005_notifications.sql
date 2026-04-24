CREATE TABLE IF NOT EXISTS "notifications" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "actor_id" text REFERENCES "users"("id"),
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "href" text,
  "is_read" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL
);
