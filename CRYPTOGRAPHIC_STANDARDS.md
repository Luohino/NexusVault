# Cryptographic Standards

NexusVault utilizes industry-standard cryptographic primitives to ensure the confidentiality and integrity of every anomaly in our care.

## 1. Encryption in Transit
*   **Protocol:** TLS 1.3 (with fallback to 1.2 for legacy systems).
*   **Cipher Suites:** Preferring AES-256-GCM and ChaCha20-Poly1305.
*   **HSTS:** Mandatory HTTP Strict Transport Security with a 1-year preload policy.

## 2. Encryption at Rest
*   **Database:** PostgreSQL databases (via Supabase) are encrypted using AES-256 at the storage layer.
*   **Secrets:** All sensitive environment variables and API keys are stored in encrypted vaults (Vercel Secrets / AWS KMS).

## 3. Hashing & Integrity
*   **Passwords:** Managed by Clerk using secure, modern hashing algorithms (e.g., Argon2 or bcrypt).
*   **Commits:** Repository integrity is maintained via SHA-based commit hashing, ensuring that the history of an anomaly cannot be altered without detection.

## 4. Key Management
*   **Rotation:** Platform-level encryption keys are rotated annually.
*   **Access:** Key access is logged and restricted to automated platform processes.

**Architect:** Luohino
