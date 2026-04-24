# Data Retention Policy

**Effective Date:** April 25, 2026

This policy outlines how NexusVault manages the lifecycle of data stored within the "Anomaly Network."

## 1. Data Types and Retention Periods

### A. Repository Content
*   **Active Repositories:** Retained for the duration of the account's existence.
*   **Deleted Repositories:** Once a user deletes a repository, the data is marked for "Garbage Collection." It is permanently purged from our primary production databases within **30 days**. Backups may contain the data for up to **90 days**.

### B. User Metadata
*   **Profile Information:** Retained until account deletion.
*   **Session Data:** Authentication logs and session cookies are retained for **14 days** to ensure security and prevent account hijacking.

### C. Collaboration Data
*   **Issues & Pull Requests:** Retained as part of the repository history. If a repository is deleted, this associated data follows the repository's retention schedule.
*   **Comments:** Deleted comments are immediately removed from the public UI but are archived in "Audit Logs" for **30 days** to investigate potential violations of the Code of Conduct.

## 2. Legal Obligations
NexusVault may retain data for longer periods than stated above if required to do so by a valid legal order, subpoena, or to comply with applicable tax and trade laws.

## 3. Data Purging Requests
Users may request an immediate "Hard Delete" of their data by contacting Luohino at **lutervyn@gmail.com**. We will process such requests within **10 business days**.
