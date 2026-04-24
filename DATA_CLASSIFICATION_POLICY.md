# Data Classification Policy

To ensure the integrity of the anomaly network, NexusVault categorizes all information into four distinct levels of sensitivity.

## 1. Level 0: Public Payloads
*   **Description:** Public repository code, issues, wiki pages, and project metadata.
*   **Access:** Open to all users and the public internet.
*   **Protection:** Integrity verification to prevent unauthorized tampering.

## 2. Level 1: User Metadata
*   **Description:** Usernames, display names, profile avatars, and public contribution history.
*   **Access:** Open to platform users.
*   **Protection:** Encryption in transit and at rest.

## 3. Level 2: Private Payloads
*   **Description:** Code and assets within Private Repositories, collaborator-only issues.
*   **Access:** Strictly restricted to the repository owner and authorized collaborators via Clerk authentication.
*   **Protection:** Full database-level isolation and Supabase Row Level Security (RLS).

## 4. Level 3: System Secrets (Nexus-Core)
*   **Description:** API keys, database credentials, encryption keys, and internal platform logs.
*   **Access:** Strictly restricted to platform maintainers (Luohino).
*   **Protection:** Hardware-level security modules and environment variable encryption.

**Compliance:** Every feature in the NexusVault roadmap must undergo a Data Classification review before deployment.
