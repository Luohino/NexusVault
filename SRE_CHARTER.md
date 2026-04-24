# Site Reliability Engineering (SRE) Charter

The NexusVault SRE Charter defines the technical standards for ensuring the availability, latency, and performance of the anomaly network.

## 1. Service Level Objectives (SLOs)
*   **Availability:** 99.9% Monthly Uptime.
*   **Latency:** 95% of API requests must complete in < 250ms.
*   **Integrity:** 100% of payload hashes must match their registered values.

## 2. Error Budgets
We balance feature velocity with stability. If the error budget for a month is exhausted (e.g., more than 43 minutes of downtime), all new feature development is suspended in favor of reliability engineering.

## 3. Monitoring & Alerting
We utilize real-time monitoring to detect anomalies before they impact users. "Critical Alerts" must be acknowledged by a Sentinel within 15 minutes.

## 4. Blameless Post-Mortems
Every P1 or P2 incident must be followed by a [Transparency Report](TRANSPARENCY_REPORT.md). We focus on identifying system failures, not human error.

## 5. Automation
SREs are tasked with automating repetitive operational tasks ("Toil"). If a task must be done more than three times, it must be codified.

**SRE Lead:** Luohino
