# Branching Strategy (The Anomaly Flow)

To ensure the stability of the production network, all code contributions to NexusVault must follow this branching and merging protocol.

## 1. Protected Branches
### `main`
*   **Purpose:** The stable, production-ready version of NexusVault.
*   **Restriction:** No direct commits. Merges are only allowed from `develop` via a Pull Request.

### `develop`
*   **Purpose:** The primary integration branch for the next release.
*   **Restriction:** Requires all CI tests to pass and at least one "Sentinel" approval (from Luohino).

## 2. Feature & Fix Branches
*   **Features:** Use the naming convention `feat/<description>` (e.g., `feat/nexus-chat`).
*   **Bug Fixes:** Use the naming convention `fix/<description>` (e.g., `fix/comment-reload`).
*   **Documentation:** Use the naming convention `docs/<description>`.

## 3. Merging Protocol
1.  **Sync:** Ensure your branch is up to date with `develop`.
2.  **Test:** Run the full [Testing Suite](TESTING_STANDARDS.md) locally.
3.  **PR:** Open a Pull Request using the [PR Template](.github/PULL_REQUEST_TEMPLATE.md).
4.  **Review:** Address any feedback from the maintainers.
5.  **Merge:** Once approved and tests pass, the PR will be merged into `develop`.

## 4. Release Protocol
Once `develop` has reached a stable milestone, it is merged into `main`, tagged with a new version (e.g., `v1.1.0`), and documented in [RELEASES.md](RELEASES.md).

**Developer Operations:** Luohino
