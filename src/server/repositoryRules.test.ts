import { describe, expect, it } from 'vitest';
import {
  canReviewPullRequest,
  countApprovedReviews,
  evaluateDirectWritePolicy,
} from './repositoryRules';

describe('evaluateDirectWritePolicy', () => {
  it('allows writes to non-default branches', () => {
    expect(evaluateDirectWritePolicy({ protectMainBranch: true, defaultBranch: 'trunk' }, 'feature/auth')).toEqual({ allowed: true });
  });

  it('blocks protected default branch writes', () => {
    expect(evaluateDirectWritePolicy({ protectMainBranch: true, defaultBranch: 'main' }, 'main')).toEqual({
      allowed: false,
      error: 'main is protected',
    });
  });

  it('blocks direct pushes when PRs are required', () => {
    expect(evaluateDirectWritePolicy({ requirePullRequest: true, defaultBranch: 'trunk' }, 'trunk')).toEqual({
      allowed: false,
      error: 'Direct pushes to trunk are blocked. Open a pull request instead.',
    });
  });
});

describe('pull request reviews', () => {
  it('does not allow authors to review their own PR', () => {
    expect(canReviewPullRequest('user_a', 'user_a')).toBe(false);
    expect(canReviewPullRequest('user_b', 'user_a')).toBe(true);
  });

  it('counts only unique non-author approvals', () => {
    expect(countApprovedReviews([
      { reviewerId: 'owner', status: 'approved' },
      { reviewerId: 'reviewer-1', status: 'approved' },
      { reviewerId: 'reviewer-1', status: 'approved' },
      { reviewerId: 'reviewer-2', status: 'changes_requested' },
      { reviewerId: 'reviewer-3', status: 'approved' },
    ], 'owner')).toBe(2);
  });
});

