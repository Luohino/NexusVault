# Database Schema Guide

This guide documents the core relational architecture of the NexusVault anomaly network. We utilize **PostgreSQL** (via Supabase) and **Drizzle ORM**.

## 1. Core Entities
### `users`
*   `id`: Primary key (Clerk ID).
*   `username`: Unique platform handle.
*   `email`: User contact (Encrypted).
*   `created_at`: Account timestamp.

### `repositories`
*   `id`: Unique identifier.
*   `owner_id`: Foreign key to `users`.
*   `name`: Repository name (Neo-Brutalist URL friendly).
*   `is_private`: Visibility toggle.
*   `description`: Project lore.

### `issues`
*   `id`: Unique identifier.
*   `repo_id`: Foreign key to `repositories`.
*   `author_id`: Foreign key to `users`.
*   `title`: Anomaly summary.
*   `status`: [open, closed].

## 2. Security (RLS)
Every table implements **Row Level Security (RLS)**. Policies ensure that:
*   Users can only update their own profiles.
*   Private repository data is only visible to the owner and authorized collaborators.
*   Public data is read-only for the public internet.

## 3. Migrations
Schema changes must be performed via the Drizzle migration suite, as documented in the [Local Development Guide](LOCAL_DEVELOPMENT_GUIDE.md).

**Database Architect:** Luohino
