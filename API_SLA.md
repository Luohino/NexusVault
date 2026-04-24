# API Service Level Agreement (SLA)

This SLA specifically governs the availability and performance of the NexusVault REST API.

## 1. Uptime Commitment
We aim for **99.9% availability** for the core API endpoints (Repositories, Issues, Users). Availability is measured by the percentage of successful (non-5xx) responses.

## 2. Performance (Latency)
*   **P95 Latency:** We target < 300ms for read operations.
*   **P95 Latency:** We target < 600ms for write operations (excluding large file uploads).

## 3. Maintenance Windows
Scheduled maintenance affecting the API will be announced via the [Transparency Report](TRANSPARENCY_REPORT.md) at least 24 hours in advance.

## 4. Rate Limits
API availability is protected by the [API Usage Policy](API_USAGE_POLICY.md). Users who exceed rate limits are not covered by this uptime commitment.

## 5. Support
Technical support for API integrators is provided via the [Support](SUPPORT.md) channels.

**DevOps Lead:** Luohino
