import type { CoinSubmission } from './api'

export type ContributorStatistics = {
  submitted: number
  approved: number
  pending: number
  needsRevision: number
  rejected: number
  approvalRate: number
}

const REVISION_STATUSES = new Set([
  'needs_revision',
  'needs-revision',
  'needs_changes',
  'needs-changes',
])

const REJECTED_STATUSES = new Set(['rejected', 'declined', 'failed', 'trash'])

export function computeContributorStatistics(
  submissions: CoinSubmission[],
): ContributorStatistics {
  let approved = 0
  let pending = 0
  let needsRevision = 0
  let rejected = 0

  for (const submission of submissions) {
    const status = submission.status.toLowerCase()

    if (status === 'pending') {
      pending += 1
    } else if (status === 'publish' || status === 'published') {
      approved += 1
    } else if (REVISION_STATUSES.has(status)) {
      needsRevision += 1
    } else if (REJECTED_STATUSES.has(status)) {
      rejected += 1
    }
  }

  const submitted = submissions.length
  const decided = approved + rejected + needsRevision
  const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : 0

  return {
    submitted,
    approved,
    pending,
    needsRevision,
    rejected,
    approvalRate,
  }
}
