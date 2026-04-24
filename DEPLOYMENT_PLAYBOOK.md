# Deployment Playbook

This playbook outlines the procedures for safe, zero-downtime releases of the NexusVault core engine.

## 1. Pre-Deployment
*   **Approval:** Pull Request has been approved by a Sentinel.
*   **Green CI:** All automated tests, lints, and security scans have passed.
*   **Database:** Verify that any required schema migrations have been tested against the staging environment.

## 2. Execution (Blue-Green Deployment)
1.  **Stage:** Deploy the new code to the "Staging" environment.
2.  **Verify:** Perform a manual smoke test of critical paths (Login, Repository View).
3.  **Traffic Shift:** Shift 10% of traffic to the new version.
4.  **Monitor:** Watch the [SRE Dashboards](SRE_CHARTER.md) for latency spikes or error increases.
5.  **Full Release:** Shift 100% of traffic to the new version.

## 3. Rollback Procedure
If a P1 or P2 anomaly is detected during deployment:
1.  Immediately revert the traffic shift to the previous stable version.
2.  Perform a post-mortem to identify why the anomaly was not detected in staging.

**Release Lead:** Luohino
