# IT Asset Management Policy

This policy defines how NexusVault manages its digital and physical infrastructure assets to ensure security and operational efficiency.

## 1. Asset Inventory
We maintain a centralized registry of all critical technical assets, including:
*   **Domain Names:** `nexusvault.dev` and associated subdomains.
*   **Cloud Infrastructure:** Supabase, Vercel, and AWS project instances.
*   **Cryptographic Assets:** API keys, TLS certificates, and recovery seeds.
*   **Intellectual Property:** Source code, trademarks, and design tokens.

## 2. Ownership & Accountability
All platform assets are owned by the project maintainers (Luohino). Specific "Sentinels" may be granted administrative access to certain assets for operational purposes.

## 3. Lifecycle Management
*   **Provisioning:** Assets are provisioned according to our [DevOps Handbook](DEVOPS_HANDBOOK.md).
*   **Maintenance:** Assets are monitored via the [SRE Charter](SRE_CHARTER.md).
*   **Decommissioning:** Retired assets (e.g., old database instances) must be securely wiped per our [Retention Schedule](RETENTION_SCHEDULE.md).

## 4. Loss or Misuse
Unauthorized access or misuse of platform assets is a violation of our [Code of Conduct](CODE_OF_CONDUCT.md) and may result in the immediate revocation of access.

**Asset Guardian:** Luohino
