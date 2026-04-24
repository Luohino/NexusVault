# API Usage Policy

NexusVault provides an API to allow developers to build tools, integrations, and "Anomaly Scanners." To ensure platform stability and fairness, all API users must comply with this policy.

## 1. Authentication
*   Most API endpoints require authentication via a NexusVault Personal Access Token (PAT).
*   You must keep your tokens secure. Leaked tokens found in public repositories will be automatically revoked.

## 2. Rate Limiting
To prevent system overload, the following limits apply:
*   **Standard Users:** 5,000 requests per hour.
*   **Public/Unauthenticated:** 60 requests per hour per IP address.
*   If you exceed these limits, you will receive a `429 Too Many Requests` response.

## 3. Identification
*   Your application must include a descriptive `User-Agent` header.
*   Example: `User-Agent: Nexus-Scanner/1.0 (Contact: user@example.com)`

## 4. Prohibited Activities
*   **Competitive Intelligence:** You may not use the API to systematically scrape user data for the purpose of building a competing service.
*   **Mass Creation:** Using the API to automate the mass creation of accounts or repositories is strictly prohibited.
*   **Excessive Polling:** Do not poll the API more frequently than necessary. Use Webhooks (where available) instead.

## 5. Termination of Access
NexusVault reserves the right to revoke API access for any application that degrades platform performance or violates these terms.

**Questions?** Contact Luohino at **lutervyn@gmail.com**.
