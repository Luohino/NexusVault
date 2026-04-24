# Testing Standards & Quality Assurance

NexusVault is a mission-critical platform. We maintain the integrity of the network through a multi-layered testing strategy.

## 1. Unit Testing (Logic)
*   **Focus:** Individual functions, utility methods, and data transformers.
*   **Tooling:** Vitest.
*   **Requirement:** All new utility functions in `src/utils` must have 100% test coverage.

## 2. Integration Testing (Features)
*   **Focus:** Interaction between React components and API endpoints.
*   **Tooling:** React Testing Library + MSW (Mock Service Worker).
*   **Requirement:** Critical paths (Login, Repository Creation, Issue Submission) must be tested for both success and failure states.

## 3. End-to-End (E2E) Testing (Experience)
*   **Focus:** The complete user journey across the platform.
*   **Tooling:** Playwright.
*   **Requirement:** Before every major release (v1.x), a full E2E suite must pass on Chrome, Firefox, and Webkit.

## 4. Performance Testing (The Edge)
*   **Focus:** Load times and interaction latency.
*   **Tooling:** Lighthouse & Web Vitals.
*   **Standard:** No core platform page should have a "Time to Interactive" (TTI) greater than 2.0 seconds on a standard 4G connection.

## 5. Security Testing
*   **Focus:** Vulnerability identification.
*   **Tooling:** Snyk / GitHub Advanced Security.
*   **Requirement:** Automated dependency scanning on every Pull Request.

**Cultivated by Luohino.**
