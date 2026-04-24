# API Reference (v1)

NexusVault provides a RESTful API for interacting with the anomaly network. All requests must be authenticated via a Bearer Token (provided by Clerk).

## 1. Authentication
Include the following header in all requests:
`Authorization: Bearer <your_jwt_token>`

## 2. Repositories
### GET `/api/repos/:username/:repoName`
Returns the metadata and file structure for a specific repository.

### PATCH `/api/repos/:username/:repoName`
Updates repository settings (e.g., visibility, default branch).

### DELETE `/api/repos/:username/:repoName`
Permanently removes the repository from the network.

## 3. Issues
### GET `/api/repos/:username/:repoName/issues`
Returns a list of all issues for the repository.

### POST `/api/repos/:username/:repoName/issues`
Creates a new issue.

### PATCH `/api/repos/:username/:repoName/issues/:id`
Updates the status or content of a specific issue.

## 4. Users
### GET `/api/users/:username`
Returns public profile metadata for a specific user.

---

**Rate Limits:** Please refer to the [API Usage Policy](API_USAGE_POLICY.md) for detailed information on rate limits and identification requirements.
