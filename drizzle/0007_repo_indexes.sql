CREATE INDEX IF NOT EXISTS repositories_owner_name_idx
  ON repositories (owner_id, name);

CREATE INDEX IF NOT EXISTS files_repository_path_idx
  ON files (repository_id, path);

CREATE INDEX IF NOT EXISTS commits_repository_timestamp_idx
  ON commits (repository_id, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS commits_repository_branch_idx
  ON commits (repository_id, branch_name);

CREATE INDEX IF NOT EXISTS tags_repository_name_idx
  ON tags (repository_id, name);

CREATE INDEX IF NOT EXISTS releases_repository_tag_name_idx
  ON releases (repository_id, tag_name);

CREATE INDEX IF NOT EXISTS branch_files_branch_path_idx
  ON branch_files (branch_id, path);

CREATE INDEX IF NOT EXISTS branches_repository_name_idx
  ON branches (repository_id, name);

CREATE INDEX IF NOT EXISTS pull_requests_repository_status_created_idx
  ON pull_requests (repository_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS repository_collaborators_repo_user_idx
  ON repository_collaborators (repository_id, user_id);

CREATE INDEX IF NOT EXISTS repository_invitations_repo_invitee_status_idx
  ON repository_invitations (repository_id, invitee_id, status);

CREATE INDEX IF NOT EXISTS wiki_pages_repository_slug_idx
  ON wiki_pages (repository_id, slug);

CREATE INDEX IF NOT EXISTS repository_topics_repository_name_idx
  ON repository_topics (repository_id, name);
