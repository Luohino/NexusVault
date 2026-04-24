# DevOps Handbook

This handbook outlines the automated systems and deployment workflows that power the NexusVault network.

## 1. CI/CD Pipeline (GitHub Actions)
Every commit to the `develop` and `main` branches triggers an automated pipeline:
1.  **Lint:** Verifying code style and formatting.
2.  **Test:** Running the full [Vitest/Playwright suite](TESTING_STANDARDS.md).
3.  **Security Scan:** Dependency audit via Snyk.
4.  **Build:** Compiling the Vite production bundle.

## 2. Infrastructure as Code (IaC)
NexusVault infrastructure is managed via code. We use automated scripts to provision Supabase tables, storage buckets, and Vercel edge functions.

## 3. Observability
*   **Logging:** Centralized log management for the Express server.
*   **Metrics:** Real-time dashboards for CPU, memory, and database connection pools.
*   **Tracing:** Distributed tracing for analyzing the latency of cross-service transmission.

## 4. Secret Management
Secrets are never stored in the repository. They are injected at runtime via the Vercel/AWS environment vault.

**DevOps Lead:** Luohino
