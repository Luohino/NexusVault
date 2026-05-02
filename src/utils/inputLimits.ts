/**
 * Frontend input limits — mirrors server-side INPUT_LIMITS from validation.ts.
 * Import and use as `maxLength` on every <input> / <textarea>.
 */
export const INPUT_LIMITS = {
  username: 39,
  repoName: 100,
  branchName: 120,
  path: 512,
  displayName: 80,
  pronouns: 40,
  location: 120,
  websiteUrl: 300,
  bio: 500,
  searchQuery: 80,
  repoDescription: 2000,
  title: 200,
  longDescription: 20000,
  markdown: 200000,
  issueComment: 10000,
  commitMessage: 300,
  tagName: 100,
  releaseAssetName: 180,
  wikiTitle: 200,
  wikiContent: 200000,
  inviteUsername: 39,
  renameTo: 100,
} as const;
