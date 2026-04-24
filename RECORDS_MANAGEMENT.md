# Records Management Policy

This policy defines how NexusVault creates, manages, and disposes of digital records related to the platform's operation and community interactions.

## 1. Classification of Records
*   **Permanent Records:** Founding manifestos, governance charters, and core architectural designs.
*   **Operational Records:** User support tickets, moderation logs, and deployment history (Retained for 5 years).
*   **Transient Records:** Temporary system logs and session tokens (Retained for 14-30 days).

## 2. Integrity of Records
All records must be stored in a format that ensures their authenticity and prevents unauthorized modification. Core governance records are hashed and stored in our [Encrypted Archives](DRP.md).

## 3. Storage & Security
Digital records are stored within the Supabase ecosystem, utilizing AES-256 encryption. Access to sensitive records is restricted to platform maintainers (Sentinels).

## 4. Disposal
Once a record reaches the end of its retention period (as defined in the [Retention Schedule](RETENTION_SCHEDULE.md)), it must be permanently purged using secure digital deletion methods.

**Archivist:** Luohino
