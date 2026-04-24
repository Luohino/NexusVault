# Data Retention & Disposal Schedule

This schedule provides specific timelines for the retention of all information processed by the NexusVault network.

| Record Type | Retention Period | Disposal Method |
| :--- | :--- | :--- |
| **User Account Metadata** | Until Deletion + 60 Days | Secure Wipe |
| **Public Repository Payloads** | Indefinite (Active) | N/A |
| **Private Repository Payloads** | Until Deletion + 30 Days | Secure Wipe |
| **Authentication Logs** | 14 Days | Automated Purge |
| **Moderation Audit Logs** | 3 Years | Archived / Wipe |
| **Support Email History** | 5 Years | Archived / Wipe |
| **API Request Metadata** | 30 Days | Automated Purge |
| **System Backup Snapshots** | 90 Days (Rolling) | Overwrite |
| **Vulnerability Reports** | 7 Years | Archived |
| **Financial Records** (Future) | 7 Years | Permanent Archive |

## 1. Purge Verification
Automated scripts run every 24 hours to identify and purge records that have exceeded their retention thresholds.

**Data Protection Lead:** Luohino
