# Troubleshooting & System Recovery

Even the most hardened anomalies can experience failures. Use this guide to resolve common technical issues within the NexusVault network.

## 1. Authentication Failures
*   **Symptom:** "Unauthorized" or "Session Expired" errors during transmission.
*   **Resolution:** 
    1.  Refresh your browser to resync with Clerk.
    2.  Clear your browser's local storage and cookies for `nexusvault.dev`.
    3.  Check [status.clerk.com](https://status.clerk.com) for identity provider outages.

## 2. Rendering Anomalies
*   **Symptom:** UI elements (borders, shadows) appearing blurred or misaligned.
*   **Resolution:** 
    1.  Ensure you are using a modern browser (Chrome 100+, Firefox 90+, Safari 15+).
    2.  Disable browser extensions that modify CSS or inject scripts.
    3.  Reset your browser zoom level to 100%.

## 3. Transmission Delays
*   **Symptom:** Slow repository loading or comment syncing.
*   **Resolution:** 
    1.  Verify your local network connection.
    2.  Check the [SLA](SERVICE_LEVEL_AGREEMENT.md) for scheduled maintenance.
    3.  Use the "Force Refresh" (Shift + F5) to pull the latest payload from the Edge.

## 4. Markdown Display Issues
*   **Symptom:** Broken previews or missing code blocks.
*   **Resolution:** 
    1.  Ensure your Markdown follows the GFM (GitHub Flavored Markdown) standard.
    2.  Check if you are using unsupported HTML tags.
    3.  Verify the "Theme" setting in your user preferences.

## 5. Escalation
If your issue persists after following these steps, please open an Issue using the [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md) or contact **lutervyn@gmail.com**.

**Support Lead:** Luohino
