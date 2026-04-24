# Change Management Policy

To protect the stability of the anomaly network, all modifications to core infrastructure, data schema, or governance protocols must follow this policy.

## 1. Request for Change (RFC)
Significant changes must be proposed via an RFC document. The RFC should include:
*   **Description:** What is being changed.
*   **Rationale:** Why the change is necessary.
*   **Impact:** Potential risks to users and infrastructure.
*   **Rollback:** How the change can be reverted if it fails.

## 2. Review & Approval
*   **Standard Changes:** (e.g., minor UI tweaks) Approved by any Sentinel.
*   **Significant Changes:** (e.g., database schema updates) Approved by the Founding Architect.
*   **Critical Changes:** (e.g., migrating infrastructure providers) Requires a formal post in the [Transparency Report](TRANSPARENCY_REPORT.md).

## 3. Implementation
Changes must be implemented according to our [Deployment Playbook](DEPLOYMENT_PLAYBOOK.md).

## 4. Post-Implementation Review
Following a significant change, the SRE team reviews the [SLA](SERVICE_LEVEL_AGREEMENT.md) metrics to ensure no degradation occurred.

**Operations Lead:** Luohino
