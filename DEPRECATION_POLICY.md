# Deprecation Policy

To maintain a high-performance environment, NexusVault must occasionally retire old features, API versions, or technical "Anomalies." This policy ensures that developers have ample time to migrate.

## 1. Notification
When a feature is marked for deprecation:
*   An announcement will be posted on the NexusVault Wiki/Blog.
*   API responses will include a `Warning` or `Deprecation` header.
*   We will provide a minimum of **90 days** notice before a Breaking Change is implemented.

## 2. Versioning
*   **Major Changes:** We increment the platform version (e.g., v1.x to v2.x).
*   **Legacy Support:** We aim to support the previous major version for at least **6 months** after the release of a new version.

## 3. Maintenance Mode
Deprecated features enter "Maintenance Mode," where they receive only critical security fixes and no new functional updates.

## 4. End of Life (EOL)
At the end of the notice period, the feature or API endpoint will be permanently removed from the production environment.

**Contact:** Luohino (lutervyn@gmail.com)
