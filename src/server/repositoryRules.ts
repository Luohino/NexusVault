export type RepositoryProtectionSettings = {
  protectMainBranch?: boolean | null;
  requirePullRequest?: boolean | null;
  requiredReviewCount?: number | null;
  defaultBranch?: string | null;
};

export type DirectWriteResult =
  | { allowed: true }
  | { allowed: false; error: string };

export const getDefaultBranchName = (settings?: RepositoryProtectionSettings | null) =>
  settings?.defaultBranch || 'main';

export const evaluateDirectWritePolicy = (
  settings: RepositoryProtectionSettings | null | undefined,
  branchName: string
): DirectWriteResult => {
  const defaultBranch = getDefaultBranchName(settings);
  if (branchName !== defaultBranch) return { allowed: true };
  if (settings?.protectMainBranch) {
    return { allowed: false, error: `${defaultBranch} is protected` };
  }
  if (settings?.requirePullRequest) {
    return { allowed: false, error: `Direct pushes to ${defaultBranch} are blocked. Open a pull request instead.` };
  }
  return { allowed: true };
};

export const canReviewPullRequest = (reviewerId: string, creatorId: string) => reviewerId !== creatorId;

export const countApprovedReviews = (
  reviews: Array<{ reviewerId: string; status: string }>,
  creatorId: string
) => new Set(
  reviews
    .filter((review) => review.status === 'approved' && review.reviewerId !== creatorId)
    .map((review) => review.reviewerId)
).size;

