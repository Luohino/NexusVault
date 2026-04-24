CREATE TABLE IF NOT EXISTS "repository_invitations" (
  "id" text PRIMARY KEY NOT NULL,
  "repository_id" text NOT NULL REFERENCES "repositories"("id"),
  "invitee_id" text NOT NULL REFERENCES "users"("id"),
  "invited_by_id" text NOT NULL REFERENCES "users"("id"),
  "role" text DEFAULT 'write' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "notification_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "responded_at" timestamp
);
